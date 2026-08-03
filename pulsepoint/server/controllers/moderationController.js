/**
 * NewsSphere – Moderation Controller
 *
 * Provides admin/moderator endpoints for:
 *  - Shadow-banning users
 *  - Journalist verification
 *  - Reviewing flagged posts/comments
 *  - Approving or removing content
 */
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

// ── Dashboard stats ────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, flaggedPosts, flaggedComments, shadowBanned, journalists] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments({ flaggedCount: { $gte: 1 } }),
      Comment.countDocuments({ isEdited: true }), // placeholder for flagged comments
      User.countDocuments({ shadowBanned: true }),
      User.countDocuments({ role: 'journalist' })
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        flaggedPosts,
        flaggedComments,
        shadowBanned,
        journalists
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Error fetching stats' });
  }
};

// ── Get flagged posts (sorted by flag count) ───────────────────
exports.getFlaggedPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [posts, total] = await Promise.all([
      Post.find({ flaggedCount: { $gte: 1 } })
        .sort({ flaggedCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('author', 'username email role shadowBanned')
        .lean(),
      Post.countDocuments({ flaggedCount: { $gte: 1 } })
    ]);

    res.json({
      success: true,
      posts,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    console.error('Flagged posts error:', error);
    res.status(500).json({ success: false, message: 'Error fetching flagged posts' });
  }
};

// ── Approve a flagged post ─────────────────────────────────────
exports.approvePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { isApproved: true, isModerated: true, flaggedCount: 0 },
      { new: true }
    );
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    res.json({ success: true, message: 'Post approved', post });
  } catch (error) {
    console.error('Approve post error:', error);
    res.status(500).json({ success: false, message: 'Error approving post' });
  }
};

// ── Remove a post ──────────────────────────────────────────────
exports.removePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    // Also remove associated comments
    await Comment.deleteMany({ post: post._id });
    await post.deleteOne();

    res.json({ success: true, message: 'Post and associated comments removed' });
  } catch (error) {
    console.error('Remove post error:', error);
    res.status(500).json({ success: false, message: 'Error removing post' });
  }
};

// ── Shadow-ban a user ──────────────────────────────────────────
exports.shadowBanUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot shadow-ban an admin' });
    }

    user.shadowBanned = !user.shadowBanned;
    await user.save();

    res.json({
      success: true,
      message: user.shadowBanned ? 'User shadow-banned' : 'Shadow-ban removed',
      shadowBanned: user.shadowBanned
    });
  } catch (error) {
    console.error('Shadow-ban error:', error);
    res.status(500).json({ success: false, message: 'Error updating shadow-ban status' });
  }
};

// ── Verify journalist ──────────────────────────────────────────
exports.verifyJournalist = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.role = 'journalist';
    user.isJournalistVerified = true;
    await user.save();

    res.json({
      success: true,
      message: 'User verified as journalist',
      user: { _id: user._id, username: user.username, role: user.role, isJournalistVerified: true }
    });
  } catch (error) {
    console.error('Verify journalist error:', error);
    res.status(500).json({ success: false, message: 'Error verifying journalist' });
  }
};

// ── Revoke journalist status ───────────────────────────────────
exports.revokeJournalist = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.role = 'user';
    user.isJournalistVerified = false;
    await user.save();

    res.json({ success: true, message: 'Journalist status revoked' });
  } catch (error) {
    console.error('Revoke journalist error:', error);
    res.status(500).json({ success: false, message: 'Error revoking journalist status' });
  }
};

// ── Change user role ───────────────────────────────────────────
exports.changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['user', 'moderator', 'journalist', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: `Role changed to ${role}`, user });
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({ success: false, message: 'Error changing role' });
  }
};

// ── Get all users (paginated) ──────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, role } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) filter.role = role;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(filter)
    ]);

    res.json({
      success: true,
      users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
};
