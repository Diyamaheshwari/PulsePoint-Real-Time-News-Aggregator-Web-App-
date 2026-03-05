const mongoose = require('mongoose');
const Thought = require('../models/Thought');
const { getWebSocketService } = require('../utils/websocket');

// Create a new thought
exports.createThought = async (req, res) => {
  try {
    const { content, user } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content is required' });
    }
    
    // Generate a unique ID for anonymous users
    let userId = user?._id || new mongoose.Types.ObjectId().toString();
    let username = user?.username || `User_${Math.random().toString(36).substr(2, 9)}`;
    
    const thought = new Thought({
      content: content.trim(),
      user: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : new mongoose.Types.ObjectId(),
      username,
      likes: [],
      dislikes: [],
      comments: [],
      isAnonymous: !user?._id // Mark if the post is from an anonymous user
    });
    const savedThought = await thought.save();
    
    // Emit new thought to all connected clients if WebSocket is available
    try {
      const webSocketService = getWebSocketService();
      if (webSocketService && webSocketService.io) {
        webSocketService.io.emit('newThought', savedThought);
      }
    } catch (wsError) {
      console.error('WebSocket emit error:', wsError);
      // Don't fail the request if WebSocket fails
    }
    
    res.status(201).json(savedThought);
  } catch (error) {
    console.error('Error creating thought:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all thoughts with pagination
exports.getThoughts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const thoughts = await Thought.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username avatar')
      .lean();

    const total = await Thought.countDocuments();

    res.json({
      thoughts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalThoughts: total
    });
  } catch (error) {
    console.error('Error fetching thoughts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update a thought
exports.updateThought = async (req, res) => {
  try {
    const { content } = req.body;
    const { id } = req.params;
    const userId = req.user._id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const thought = await Thought.findOne({ _id: id, user: userId });

    if (!thought) {
      return res.status(404).json({ message: 'Thought not found or unauthorized' });
    }

    thought.content = content.trim();
    await thought.save();

    // Emit updated thought to all connected clients
    const io = WebSocketService.getInstance().io;
    io.emit('updateThought', thought);

    res.json(thought);
  } catch (error) {
    console.error('Error updating thought:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a thought
exports.deleteThought = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const thought = await Thought.findOneAndDelete({ _id: id, user: userId });

    if (!thought) {
      return res.status(404).json({ message: 'Thought not found or unauthorized' });
    }

    // Emit deleted thought ID to all connected clients
    const io = WebSocketService.getInstance().io;
    io.emit('deleteThought', { _id: id });

    res.json({ message: 'Thought deleted successfully' });
  } catch (error) {
    console.error('Error deleting thought:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Like/Unlike a thought
exports.toggleLikeThought = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'No thought with that ID' });
    }

    const thought = await Thought.findById(id);
    if (!thought) {
      return res.status(404).json({ message: 'No thought with that ID' });
    }

    const likeIndex = thought.likes.indexOf(userId);
    const dislikeIndex = thought.dislikes.indexOf(userId);

    // Remove from dislikes if present
    if (dislikeIndex !== -1) {
      thought.dislikes.splice(dislikeIndex, 1);
    }

    // Toggle like
    if (likeIndex === -1) {
      thought.likes.push(userId);
    } else {
      thought.likes.splice(likeIndex, 1);
    }

    const updatedThought = await thought.save();

    // Emit update to all connected clients if WebSocket is available
    try {
      const webSocketService = getWebSocketService();
      if (webSocketService) {
        webSocketService.broadcast('thought_updated', updatedThought);
      }
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
    }

    res.json(updatedThought);
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Dislike/Undislike a thought
exports.toggleDislikeThought = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const thought = await Thought.findById(id);

    if (!thought) {
      return res.status(404).json({ message: 'Thought not found' });
    }

    const dislikeIndex = thought.dislikes.indexOf(userId);
    const hasDisliked = dislikeIndex !== -1;

    if (hasDisliked) {
      // Remove dislike
      thought.dislikes.splice(dislikeIndex, 1);
    } else {
      // Add dislike and remove like if exists
      const likeIndex = thought.likes.indexOf(userId);
      if (likeIndex !== -1) {
        thought.likes.splice(likeIndex, 1);
      }
      thought.dislikes.push(userId);
    }

    await thought.save();

    // Emit updated thought to all connected clients
    const io = getWebSocketService();
    if (io && io.io) {
      io.io.emit('updateThought', thought);
    }

    res.json(thought);
  } catch (error) {
    console.error('Error toggling dislike on thought:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add a comment to a thought
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user._id;
    const username = req.user.username;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const thought = await Thought.findById(id);

    if (!thought) {
      return res.status(404).json({ message: 'Thought not found' });
    }

    const comment = {
      user: userId,
      username,
      content: content.trim(),
      createdAt: new Date()
    };

    thought.comments.push(comment);
    await thought.save();

    // Populate the user field for the response
    const updatedThought = await Thought.findById(id).populate('user', 'username avatar');

    // Emit updated thought to all connected clients
    const io = WebSocketService.getInstance().io;
    io.emit('updateThought', updatedThought);

    res.status(201).json(updatedThought);
  } catch (error) {
    console.error('Error adding comment to thought:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Dislike/Undislike a thought
exports.toggleDislikeThought = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const thought = await Thought.findById(id);

    if (!thought) {
      return res.status(404).json({ message: 'Thought not found' });
    }

    const dislikeIndex = thought.dislikes.indexOf(userId);
    const hasDisliked = dislikeIndex !== -1;

    if (hasDisliked) {
      // Remove dislike
      thought.dislikes.splice(dislikeIndex, 1);
    } else {
      // Add dislike and remove like if exists
      const likeIndex = thought.likes.indexOf(userId);
      if (likeIndex !== -1) {
        thought.likes.splice(likeIndex, 1);
      }
      thought.dislikes.push(userId);
    }

    await thought.save();

    // Emit updated thought to all connected clients
    const io = getWebSocketService();
    if (io && io.io) {
      io.io.emit('updateThought', thought);
    }

    res.json(thought);
  } catch (error) {
    console.error('Error toggling dislike on thought:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
