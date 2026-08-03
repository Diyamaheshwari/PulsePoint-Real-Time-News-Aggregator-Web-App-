const Community = require('../models/Community');
const Post = require('../models/Post');
const { error } = require('../utils/logger');

// Get all communities, optionally filtered by search or location
exports.getCommunities = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (search) {
      query.$text = { $search: search };
    }
    if (category && category !== 'all') {
      query.category = category;
    }

    const communities = await Community.find(query)
      .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('creator', 'username avatar');

    const total = await Community.countDocuments(query);

    res.json({
      success: true,
      communities,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    error('Error fetching communities:', err);
    res.status(500).json({ success: false, message: 'Error fetching communities' });
  }
};

// Create a new community
exports.createCommunity = async (req, res) => {
  try {
    const { name, description, category, isLocal, location } = req.body;

    if (!name || !description) {
      return res.status(400).json({ success: false, message: 'Name and description are required' });
    }

    // Check if name exists
    const existing = await Community.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A community with this name already exists' });
    }

    const communityData = {
      name,
      description,
      category,
      creator: req.user._id,
      members: [req.user._id], // Creator joins automatically
    };

    if (isLocal && location && location.latitude && location.longitude) {
      communityData.isLocal = true;
      communityData.location = {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      };
    }

    const community = await Community.create(communityData);

    res.status(201).json({ success: true, community });
  } catch (err) {
    error('Error creating community:', err);
    res.status(500).json({ success: false, message: 'Error creating community' });
  }
};

// Join or leave a community
exports.toggleJoinCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const community = await Community.findById(id);

    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    const isMember = community.members.includes(req.user._id);

    if (isMember) {
      community.members.pull(req.user._id);
    } else {
      community.members.push(req.user._id);
    }

    await community.save();

    res.json({ success: true, isMember: !isMember, memberCount: community.members.length });
  } catch (err) {
    error('Error toggling community membership:', err);
    res.status(500).json({ success: false, message: 'Error updating membership' });
  }
};

// Get single community details
exports.getCommunityDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const community = await Community.findById(id).populate('creator', 'username avatar');
    
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    res.json({ success: true, community });
  } catch (err) {
    error('Error fetching community details:', err);
    res.status(500).json({ success: false, message: 'Error fetching community details' });
  }
};

// Get posts for a specific community
exports.getCommunityPosts = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ community: id, isApproved: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('author', 'username avatar role trustScore')
      .populate('community', 'name isLocal');

    const total = await Post.countDocuments({ community: id, isApproved: true });

    res.json({
      success: true,
      posts,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    error('Error fetching community posts:', err);
    res.status(500).json({ success: false, message: 'Error fetching community posts' });
  }
};

// Create a post in a specific community
exports.createCommunityPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, category } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    // Only members can post
    if (!community.members.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You must join this community to post' });
    }

    const postData = {
      content,
      category: category || community.category,
      author: req.user._id,
      community: id,
    };

    // If community is local, attach its coordinates to the post
    if (community.isLocal && community.location && community.location.coordinates) {
      postData.location = community.location;
    }

    const newPost = await Post.create(postData);
    await newPost.populate('author', 'username avatar role trustScore');
    await newPost.populate('community', 'name isLocal');

    res.status(201).json({ success: true, post: newPost });
  } catch (err) {
    error('Error creating community post:', err);
    res.status(500).json({ success: false, message: 'Error creating post' });
  }
};
