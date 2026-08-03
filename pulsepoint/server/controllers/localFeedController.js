/**
 * NewsSphere – Local Feed Controller
 *
 * Provides geospatial querying for user-generated local posts
 * using MongoDB's $nearSphere operator and the Post model's
 * 2dsphere index.
 */
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');

// ── Get local feed (geo-tagged posts near user) ────────────────
exports.getLocalFeed = async (req, res) => {
  try {
    const {
      lng,
      lat,
      radius,        // in km, defaults to user.radius or 10
      category,
      page = 1,
      limit = 20,
      sortBy = 'recent' // 'recent' | 'popular'
    } = req.query;

    // Resolve coordinates
    let longitude = parseFloat(lng);
    let latitude = parseFloat(lat);
    let maxDistance = parseFloat(radius) || req.user?.radius || 10;

    // Fall back to user's stored location if not provided in query
    if (isNaN(longitude) || isNaN(latitude)) {
      if (req.user?.location?.coordinates?.length === 2) {
        [longitude, latitude] = req.user.location.coordinates;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Location coordinates required. Provide lng/lat params or set location in profile.'
        });
      }
    }

    // Build filter
    const filter = {
      isApproved: true,
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: maxDistance * 1000 // convert km → meters
        }
      }
    };

    if (category && category !== 'all') {
      filter.category = category;
    }

    // Exclude shadow-banned users' posts for non-moderators
    if (req.user?.role !== 'admin' && req.user?.role !== 'moderator') {
      const shadowBannedIds = await User.find({ shadowBanned: true }).distinct('_id');
      if (shadowBannedIds.length) {
        filter.author = { $nin: shadowBannedIds };
      }
    }

    // Sorting
    let sort = { createdAt: -1 };
    if (sortBy === 'popular') {
      sort = { 'likes.length': -1, createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('author', 'username role isJournalistVerified avatar')
      .populate({
        path: 'comments',
        options: { limit: 3, sort: { createdAt: -1 } },
        populate: { path: 'author', select: 'username avatar' }
      })
      .lean();

    // Attach computed distance to each post
    const postsWithDistance = posts.map(post => {
      const [pLng, pLat] = post.location?.coordinates || [0, 0];
      const distKm = haversineDistance(latitude, longitude, pLat, pLng);
      return {
        ...post,
        distance: Math.round(distKm * 100) / 100, // 2 decimal places
        distanceLabel: distKm < 1 ? `${Math.round(distKm * 1000)}m away` : `${distKm.toFixed(1)}km away`
      };
    });

    // Get total (approximation — $nearSphere doesn't support countDocuments directly)
    const total = posts.length < parseInt(limit) ? skip + posts.length : skip + parseInt(limit) + 1;

    res.json({
      success: true,
      posts: postsWithDistance,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: posts.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Local feed error:', error);
    res.status(500).json({ success: false, message: 'Error fetching local feed' });
  }
};

// ── Create local post ──────────────────────────────────────────
exports.createLocalPost = async (req, res) => {
  try {
    const { content, category, isAnonymous, lng, lat, imageUrl } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    // Resolve coordinates
    let longitude = parseFloat(lng);
    let latitude = parseFloat(lat);
    if (isNaN(longitude) || isNaN(latitude)) {
      if (req.user?.location?.coordinates?.length === 2) {
        [longitude, latitude] = req.user.location.coordinates;
      } else {
        return res.status(400).json({ success: false, message: 'Location is required for local posts' });
      }
    }

    const post = await Post.create({
      content: content.trim(),
      author: req.user._id,
      category: category || 'General',
      isAnonymous: !!isAnonymous,
      imageUrl: imageUrl || '',
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      }
    });

    const populated = await Post.findById(post._id)
      .populate('author', 'username role isJournalistVerified avatar');

    // Emit to Socket.io for real-time local feed updates
    const io = req.app.get('webSocketService')?.io;
    if (io) {
      io.emit('newLocalPost', populated);
    }

    res.status(201).json({ success: true, post: populated });
  } catch (error) {
    console.error('Create local post error:', error);
    res.status(500).json({ success: false, message: 'Error creating post' });
  }
};

// ── Get single post with full comments ─────────────────────────
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username role isJournalistVerified avatar')
      .populate({
        path: 'comments',
        populate: [
          { path: 'author', select: 'username avatar' },
          {
            path: 'replies',
            populate: { path: 'author', select: 'username avatar' }
          }
        ]
      })
      .lean();

    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    res.json({ success: true, post });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ success: false, message: 'Error fetching post' });
  }
};

// ── Like / unlike a post ───────────────────────────────────────
exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const userId = req.user._id;
    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.push(userId);
    }
    await post.save();

    res.json({ success: true, liked: !isLiked, likeCount: post.likes.length });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ success: false, message: 'Error toggling like' });
  }
};

// ── Flag a post ────────────────────────────────────────────────
exports.flagPost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { flaggedCount: 1 } },
      { new: true }
    );
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    // Auto-moderate if flagged too many times
    if (post.flaggedCount >= 5 && !post.isModerated) {
      post.isModerated = true;
      post.isApproved = false;
      await post.save();
    }

    res.json({ success: true, message: 'Post flagged for review' });
  } catch (error) {
    console.error('Flag post error:', error);
    res.status(500).json({ success: false, message: 'Error flagging post' });
  }
};

// ── Haversine distance helper (km) ─────────────────────────────
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
