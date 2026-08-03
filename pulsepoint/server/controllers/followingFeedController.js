const Post = require('../models/Post');
const User = require('../models/User');
const Community = require('../models/Community');

// ── Get following feed ─────────────────────────────────────────
exports.getFollowingFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get current user and their communities
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const Community = require('../models/Community');
    const userCommunities = await Community.find({ members: currentUser._id }).distinct('_id');

    const filter = {
      isApproved: true,
      $or: [
        { author: { $in: currentUser.following } },
        { community: { $in: userCommunities } }
      ]
    };

    // If they aren't following anyone and aren't in any communities, return empty or fallback
    if (currentUser.following.length === 0 && userCommunities.length === 0) {
      return res.json({
        success: true,
        posts: [],
        pagination: { page: parseInt(page), limit: parseInt(limit), hasMore: false }
      });
    }

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('author', 'username role isJournalistVerified avatar trustScore')
      .populate('community', 'name isLocal')
      .populate({
        path: 'comments',
        options: { limit: 3, sort: { createdAt: -1 } },
        populate: { path: 'author', select: 'username avatar' }
      })
      .lean();

    res.json({
      success: true,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: posts.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Following feed error:', error);
    res.status(500).json({ success: false, message: 'Error fetching following feed' });
  }
};
