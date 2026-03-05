const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Poll = require('../models/Poll');
const { info, error } = require('../utils/logger');
const { getWebSocketService } = require('../services/websocketService');

// Post Controllers
exports.createPost = async (req, res) => {
  try {
    const { content, imageUrl, tags } = req.body;
    
    // Ensure user is authenticated and has an ID
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to create a post'
      });
    }

    // Create post with author and required fields
    const postData = {
      content,
      author: req.user.id, // Ensure author is set from authenticated user
      imageUrl: imageUrl || '',
      tags: Array.isArray(tags) ? tags : []
    };

    // Validate required fields
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Post content is required'
      });
    }

    const post = await Post.create(postData);

    // Populate author details
    await post.populate('author', 'username avatar');

    // Notify all connected clients about the new post
    const webSocketService = getWebSocketService();
    if (webSocketService) {
      webSocketService.emitToPostUsers(post._id, 'new_post', post);
    }

    res.status(201).json({
      success: true,
      data: post
    });
  } catch (err) {
    error('Error creating post:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to create post',
      message: err.message
    });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const posts = await Post.find({})
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('author', 'username avatar')
      .populate({
        path: 'comments',
        options: { sort: { createdAt: -1 }, limit: 3 },
        populate: {
          path: 'author',
          select: 'username avatar'
        }
      });

    const total = await Post.countDocuments();

    res.json({
      success: true,
      data: posts,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    error('Error fetching posts:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts',
      message: err.message
    });
  }
};

// Comment Controllers
exports.createComment = async (req, res) => {
  try {
    const { content, postId, parentCommentId } = req.body;
    const author = req.user.id;

    const commentData = {
      content,
      author,
      post: postId,
      parentComment: parentCommentId || null
    };

    const comment = await Comment.create(commentData);

    // Add comment to post's comments array
    await Post.findByIdAndUpdate(postId, {
      $push: { comments: comment._id }
    });

    // Populate author details
    await comment.populate('author', 'username avatar');

    // Notify all clients about the new comment
    const webSocketService = getWebSocketService();
    if (webSocketService) {
      webSocketService.notifyNewComment(comment, postId);
    }

    res.status(201).json({
      success: true,
      data: comment
    });
  } catch (err) {
    error('Error creating comment:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to create comment',
      message: err.message
    });
  }
};

exports.getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({ 
      post: postId,
      parentComment: null // Only top-level comments
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('author', 'username avatar')
      .populate({
        path: 'replies',
        options: { sort: { createdAt: -1 } },
        populate: {
          path: 'author',
          select: 'username avatar'
        }
      });

    const total = await Comment.countDocuments({ post: postId, parentComment: null });

    res.json({
      success: true,
      data: comments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    error('Error fetching comments:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments',
      message: err.message
    });
  }
};

// Reaction Controllers
exports.toggleLike = async (req, res) => {
  try {
    const { type, id } = req.params; // type can be 'post' or 'comment'
    const userId = req.user.id;

    let model;
    switch (type) {
      case 'post':
        model = Post;
        break;
      case 'comment':
        model = Comment;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid type. Must be "post" or "comment"'
        });
    }

    let item = await model.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: `${type} not found`
      });
    }

    const likeIndex = item.likes.indexOf(userId);
    let message;
    
    if (likeIndex === -1) {
      // Add like
      item.likes.push(userId);
      message = 'Liked successfully';
    } else {
      // Remove like
      item.likes.splice(likeIndex, 1);
      message = 'Like removed';
    }

    item = await item.save();

    // Notify all clients about the post update
    const webSocketService = getWebSocketService();
    if (webSocketService) {
      if (type === 'post') {
        const populatedPost = await Post.findById(item._id)
          .populate('author', 'username avatar')
          .populate({
            path: 'comments',
            options: { sort: { createdAt: -1 }, limit: 3 },
            populate: { path: 'author', select: 'username avatar' }
          });
        webSocketService.notifyPostUpdate(populatedPost);
      } else if (type === 'comment') {
        const populatedComment = await Comment.findById(item._id)
          .populate('author', 'username avatar');
        webSocketService.notifyCommentUpdate(populatedComment, item.post);
      }
    }

    res.json({
      success: true,
      message,
      likes: item.likes.length
    });
  } catch (err) {
    error('Error toggling like:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle like',
      message: err.message
    });
  }
};

exports.voteInPoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const { optionIndex } = req.body;
    const userId = req.user.id;

    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({
        success: false,
        error: 'Poll not found'
      });
    }

    if (!poll.isActive || poll.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'This poll is no longer active'
      });
    }

    await poll.addVote(parseInt(optionIndex), userId);
    const results = poll.getResults();

    res.json({
      success: true,
      data: results
    });
  } catch (err) {
    error('Error voting in poll:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to submit vote',
      message: err.message
    });
  }
};

exports.getActivePolls = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const polls = await Poll.find({
      isActive: true,
      expiresAt: { $gt: new Date() }
    })
      .sort({ isDailyPoll: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate('createdBy', 'username avatar');

    res.json({
      success: true,
      data: polls
    });
  } catch (err) {
    error('Error fetching active polls:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active polls',
      message: err.message
    });
  }
};

// Poll Controllers
exports.createPoll = async (req, res) => {
  try {
    const { question, options, description, category, expiresInDays = 1 } = req.body;
    const author = req.user.id;

    // Calculate expiration date (default: 1 day from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));
    expiresAt.setHours(23, 59, 59, 999); // End of day

    // Format options with initial vote count
    const formattedOptions = options.map(option => ({
      text: option,
      votes: 0
    }));

    const poll = await Poll.create({
      question,
      description: description || '',
      options: formattedOptions,
      author,
      category: category || 'General',
      expiresAt,
      isActive: true
    });

    // Populate author details
    await poll.populate('author', 'username avatar');

    // Notify all clients about the new poll
    const webSocketService = getWebSocketService();
    if (webSocketService) {
      webSocketService.notifyPollUpdate(poll);
    }

    res.status(201).json({
      success: true,
      data: poll
    });
  } catch (err) {
    error('Error creating poll:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to create poll',
      message: err.message
    });
  }
};

// AI Integration for Daily Polls
exports.generateDailyPoll = async (req, res) => {
  try {
    // This would be connected to an AI service to generate a relevant poll
    // For now, we'll create a simple placeholder
    
    const dailyPolls = await Poll.find({
      isDailyPoll: true,
      createdAt: { 
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });

    // If a daily poll already exists for today, return it
    if (dailyPolls.length > 0) {
      return res.json({
        success: true,
        data: dailyPolls[0],
        message: 'Using existing daily poll'
      });
    }

    // TODO: Integrate with AI service to generate a relevant poll
    // For now, using a placeholder
    const aiGeneratedPoll = await Poll.create({
      question: 'What is the most important issue facing our community today?',
      description: 'Vote on what you think is the most pressing issue we should address.',
      options: [
        { text: 'Climate Change', votes: 0 },
        { text: 'Economic Inequality', votes: 0 },
        { text: 'Healthcare Access', votes: 0 },
        { text: 'Education Reform', votes: 0 }
      ],
      author: req.user ? req.user.id : null,
      expiresAt: new Date().setHours(23, 59, 59, 999), // End of day
      isDailyPoll: true,
      isAIGenerated: true,
      category: 'General',
      tags: ['daily', 'community', 'ai-generated']
    });

    // Populate author details for the response
    await aiGeneratedPoll.populate('author', 'username avatar');

    // Notify all clients about the new poll
    const webSocketService = getWebSocketService();
    if (webSocketService) {
      webSocketService.notifyPollUpdate(aiGeneratedPoll);
    }

    res.status(201).json({
      success: true,
      data: aiGeneratedPoll,
      message: 'New daily poll generated'
    });
  } catch (err) {
    error('Error generating daily poll:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to generate daily poll',
      message: err.message
    });
  }
};
