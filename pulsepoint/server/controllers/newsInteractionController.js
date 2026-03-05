const NewsInteraction = require('../models/NewsInteraction');
const { getIo } = require('../services/websocketService');
const { validationResult } = require('express-validator');

// Get or create interaction for an article
const getOrCreateInteraction = async (articleId) => {
  let interaction = await NewsInteraction.findOne({ articleId });
  if (!interaction) {
    interaction = new NewsInteraction({ articleId });
    await interaction.save();
  }
  return interaction;
};

// Add a comment to an article
exports.addComment = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    const interaction = await getOrCreateInteraction(articleId);
    
    // Add the new comment
    interaction.comments.push({
      userId,
      content: content.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await interaction.save();

    // Emit socket event
    const io = getIo();
    if (io) {
      io.emit('newComment', { articleId, comment: interaction.comments[interaction.comments.length - 1] });
      io.emit('updateCommentCount', { articleId, count: interaction.commentCount });
    }

    res.status(201).json({
      success: true,
      comment: interaction.comments[interaction.comments.length - 1],
      commentCount: interaction.commentCount
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get comments for an article
exports.getComments = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { limit = 10, skip = 0 } = req.query;

    const interaction = await NewsInteraction.findOne({ articleId })
      .select('comments')
      .populate('comments.userId', 'username avatar')
      .sort({ 'comments.createdAt': -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      comments: interaction?.comments || [],
      hasMore: interaction ? interaction.comments.length > (parseInt(skip) + parseInt(limit)) : false
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Add or update a reaction to an article
exports.addReaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { articleId } = req.params;
    const { type } = req.body;
    const userId = req.user._id;

    if (!['like', 'angry', 'sad', 'support'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid reaction type. Must be one of: like, angry, sad, support' 
      });
    }

    const interaction = await getOrCreateInteraction(articleId);
    
    // Check if user already has a reaction
    const existingReactionIndex = interaction.reactions.findIndex(
      r => r.userId.toString() === userId.toString()
    );

    if (existingReactionIndex >= 0) {
      // If same reaction type, remove it (toggle off)
      if (interaction.reactions[existingReactionIndex].type === type) {
        interaction.reactions.splice(existingReactionIndex, 1);
      } else {
        // Update to new reaction type
        interaction.reactions[existingReactionIndex].type = type;
        interaction.reactions[existingReactionIndex].createdAt = new Date();
      }
    } else {
      // Add new reaction
      interaction.reactions.push({
        userId,
        type,
        createdAt: new Date()
      });
    }

    await interaction.save();

    // Emit socket event
    const io = getIo();
    if (io) {
      io.emit('reactionUpdate', {
        articleId,
        reactions: interaction.getReactionCounts(),
        userId: userId.toString(),
        userReaction: interaction.getUserReaction(userId)
      });
    }

    res.status(200).json({
      success: true,
      reactions: interaction.getReactionCounts(),
      userReaction: interaction.getUserReaction(userId)
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get reactions for an article
exports.getReactions = async (req, res) => {
  try {
    const { articleId } = req.params;
    const userId = req.user?._id;

    const interaction = await getOrCreateInteraction(articleId);
    
    res.status(200).json({
      success: true,
      reactions: interaction.getReactionCounts(),
      userReaction: interaction.getUserReaction(userId)
    });
  } catch (error) {
    console.error('Error fetching reactions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get user reactions for multiple articles
exports.getUserReactions = async (req, res) => {
  try {
    const { articleIds } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'articleIds must be a non-empty array' 
      });
    }

    const interactions = await NewsInteraction.find({
      articleId: { $in: articleIds }
    });

    // Create a map of articleId to user's reaction
    const userReactions = {};
    interactions.forEach(interaction => {
      const userReaction = interaction.reactions.find(
        r => r.userId.toString() === userId.toString()
      );
      userReactions[interaction.articleId] = userReaction ? userReaction.type : null;
    });

    // Ensure all requested article IDs are in the response
    articleIds.forEach(articleId => {
      if (userReactions[articleId] === undefined) {
        userReactions[articleId] = null;
      }
    });

    res.status(200).json({
      success: true,
      userReactions
    });
  } catch (error) {
    console.error('Error fetching user reactions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching user reactions' 
    });
  }
};
