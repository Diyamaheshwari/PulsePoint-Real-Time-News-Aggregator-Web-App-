const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['like', 'angry', 'sad', 'support'], required: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const newsInteractionSchema = new mongoose.Schema({
  articleId: { type: String, required: true, index: true },
  comments: [commentSchema],
  reactions: [reactionSchema],
  reactionCounts: {
    like: { type: Number, default: 0, min: 0 },
    angry: { type: Number, default: 0, min: 0 },
    sad: { type: Number, default: 0, min: 0 },
    support: { type: Number, default: 0, min: 0 }
  },
  userReactions: { type: Map, of: String, default: {} }, // Maps userId to reaction type
  commentCount: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for faster lookups
newsInteractionSchema.index({ articleId: 1 }, { unique: true });

// Update reaction counts when reactions are modified
newsInteractionSchema.pre('save', function(next) {
  // Initialize reaction counts to zero
  const reactionCounts = {
    like: 0,
    angry: 0,
    sad: 0,
    support: 0
  };

  // Count each reaction type
  this.reactions.forEach(reaction => {
    if (reactionCounts.hasOwnProperty(reaction.type)) {
      reactionCounts[reaction.type]++;
    }
  });

  // Update reaction counts
  this.reactionCounts = reactionCounts;
  
  // Update userReactions map
  this.userReactions = new Map();
  this.reactions.forEach(reaction => {
    this.userReactions.set(reaction.userId.toString(), reaction.type);
  });
  
  // Update comment count
  this.commentCount = this.comments.length;
  this.lastUpdated = new Date();
  next();
});

// Add a method to get user's reaction
newsInteractionSchema.methods.getUserReaction = function(userId) {
  return this.userReactions.get(userId?.toString()) || null;
};

// Add a method to get reaction counts
newsInteractionSchema.methods.getReactionCounts = function() {
  return {
    like: this.reactionCounts.like || 0,
    angry: this.reactionCounts.angry || 0,
    sad: this.reactionCounts.sad || 0,
    support: this.reactionCounts.support || 0
  };
};

const NewsInteraction = mongoose.model('NewsInteraction', newsInteractionSchema);

module.exports = NewsInteraction;
