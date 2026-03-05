const Poll = require('../models/Poll');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

exports.createPoll = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { question, description, options, expiresAt, tags } = req.body;
    // Log the incoming request and user
    console.log('Create poll request:', { 
      user: req.user,
      body: req.body,
      headers: req.headers
    });
    // Validate options
    if (!options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: 'At least two options are required' });
    }
    // Validate each option
    const validOptions = options.filter(opt => opt && opt.text && opt.text.trim() !== '');
    if (validOptions.length < 2) {
      return res.status(400).json({ message: 'At least two valid options are required' });
    }
    const poll = new Poll({
      question,
      description: description || '',
      options: validOptions.map(option => ({
        text: option.text,
        voters: []
      })),
      createdBy: req.user ? req.user._id : null, // Use req.user._id instead of req.user.id
      expiresAt: new Date(expiresAt),
      tags: Array.isArray(tags) ? tags : [],
      totalVotes: 0
    });
    await poll.save();
    
    // Populate createdBy with user details
    const populatedPoll = await Poll.findById(poll._id)
      .populate('createdBy', 'username avatar')
      .lean();
    res.status(201).json(populatedPoll);
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all polls (both active and expired)
// @route   GET /api/polls
// @access  Public
exports.getPolls = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get all active polls
    const [activePolls, expiredPolls] = await Promise.all([
      Poll.find({ isActive: true, expiresAt: { $gt: new Date() } })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'username avatar')
        .lean(),
      Poll.find({ 
        $or: [
          { isActive: false },
          { expiresAt: { $lte: new Date() } }
        ]
      })
        .sort({ expiresAt: -1 })
        .populate('createdBy', 'username avatar')
        .lean()
    ]);

    // Combine and sort all polls (active first, then expired)
    const allPolls = [
      ...activePolls.map(poll => ({ ...poll, isExpired: false })),
      ...expiredPolls.map(poll => ({ ...poll, isExpired: true }))
    ];

    // Apply pagination after combining
    const paginatedPolls = allPolls.slice(skip, skip + limit);
    const total = allPolls.length;

    res.json({
      polls: paginatedPolls,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalPolls: total
    });
  } catch (error) {
    console.error('Error fetching polls:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Vote on a poll
// @route   POST /api/polls/:id/vote
// @access  Private
exports.voteOnPoll = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { optionIndex } = req.body;
    const userId = req.user?._id || req.user?.id; // Handle both formats
    const pollId = req.params.id;

    console.log('Vote request received:', { userId, pollId, optionIndex });

    // Validate request
    if (typeof optionIndex === 'undefined' || optionIndex === null) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Option index is required' });
    }

    // Find the poll with session
    const poll = await Poll.findById(pollId).session(session);
    if (!poll) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Check if poll is active
    const now = new Date();
    const isExpired = new Date(poll.expiresAt) < now;
    
    if (!poll.isActive || isExpired) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: isExpired ? 'This poll has expired' : 'This poll is no longer active' 
      });
    }

    // Check if user has already voted
    const hasVoted = poll.options.some(option => 
      option.voters.some(voter => {
        const voterId = voter?._id?.toString() || voter?.toString();
        return voterId === userId.toString();
      })
    );

    if (hasVoted) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'You have already voted on this poll' });
    }

    // Validate option index
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid option selected' });
    }

    // Add vote
    poll.options[optionIndex].voters.push(userId);
    poll.totalVotes = (poll.totalVotes || 0) + 1;
    
    // Mark as modified to ensure Mongoose saves the changes
    poll.markModified('options');
    
    // Save with session
    await poll.save({ session });
    await session.commitTransaction();
    
    // Populate createdBy for the response
    await poll.populate('createdBy', 'username avatar');
    
    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('pollUpdate', poll);
    }
    
    console.log('Vote recorded successfully for poll:', pollId);
    res.json(poll.toObject({ virtuals: true }));
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Error voting on poll:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid poll ID format' });
    }
    
    res.status(500).json({ 
      message: 'Failed to process your vote',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};

// @desc    Update a poll
// @route   PUT /api/polls/:id
// @access  Private
exports.updatePoll = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { question, options } = req.body;
    const pollId = req.params.id;
    const userId = req.user.id;

    // Find the poll
    const poll = await Poll.findById(pollId).session(session);
    if (!poll) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Check if user is the owner
    if (poll.createdBy.toString() !== userId) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'Not authorized to update this poll' });
    }

    // Check if poll is still active
    if (!poll.isActive || new Date(poll.expiresAt) < new Date()) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Cannot update an inactive or expired poll' });
    }

    // Update poll
    poll.question = question || poll.question;
    
    // Only update options if they are provided and the poll has no votes yet
    if (options && Array.isArray(options) && poll.totalVotes === 0) {
      poll.options = options.map(opt => ({
        text: opt.text,
        voters: []
      }));
    }

    await poll.save({ session });
    await session.commitTransaction();
    
    // Populate createdBy for the response
    await poll.populate('createdBy', 'username avatar');
    
    // Emit real-time update
    req.app.get('io').emit('pollUpdate', { pollId, poll });
    
    res.json(poll);
  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating poll:', error);
    res.status(500).json({ 
      message: 'Error updating poll',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};

// @desc    Delete a poll
// @route   DELETE /api/polls/:id
// @access  Private
exports.deletePoll = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const pollId = req.params.id;
    const userId = req.user.id;

    // Find the poll
    const poll = await Poll.findById(pollId).session(session);
    if (!poll) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Check if user is the owner or admin
    if (poll.createdBy.toString() !== userId && !req.user.isAdmin) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'Not authorized to delete this poll' });
    }

    // Delete the poll
    await Poll.findByIdAndDelete(pollId).session(session);
    await session.commitTransaction();
    
    // Emit real-time update
    req.app.get('io').emit('pollDeleted', { pollId });
    
    res.json({ message: 'Poll deleted successfully' });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error deleting poll:', error);
    res.status(500).json({ 
      message: 'Error deleting poll',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};

// @desc    Get poll results
// @route   GET /api/polls/:id/results
// @access  Public
exports.getPollResults = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id)
      .populate('createdBy', 'username avatar')
      .lean();

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    const results = {
      ...poll,
      options: poll.options.map(option => ({
        ...option,
        percentage: poll.totalVotes > 0 
          ? Math.round((option.voters.length / poll.totalVotes) * 100) 
          : 0
      }))
    };

    res.json(results);
  } catch (error) {
    console.error('Error getting poll results:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
