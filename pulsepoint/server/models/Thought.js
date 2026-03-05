const mongoose = require('mongoose');

const thoughtSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Add text index for search functionality
thoughtSchema.index({ content: 'text' });

// Virtual for getting like count
thoughtSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for getting comment count
thoughtSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Method to check if a user has liked the thought
thoughtSchema.methods.hasLiked = function(userId) {
  return this.likes.some(id => id.equals(userId));
};

// Method to check if a user has disliked the thought
thoughtSchema.methods.hasDisliked = function(userId) {
  return this.dislikes.some(id => id.equals(userId));
};

const Thought = mongoose.model('Thought', thoughtSchema);

module.exports = Thought;
