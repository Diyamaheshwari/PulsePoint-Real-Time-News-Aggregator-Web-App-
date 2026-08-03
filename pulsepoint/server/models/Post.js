const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Post cannot be more than 1000 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    default: null
  },
  imageUrl: {
    type: String,
    default: ''
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: ['Traffic', 'Safety', 'Events', 'Weather', 'Politics', 'General', 'Alert', 'Event', 'Discussion', 'Lost&Found'],
    default: 'General'
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  location: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false // Now optional since community posts might not be geo-located
    }
  },
  flaggedCount: {
    type: Number,
    default: 0
  },
  isModerated: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create 2dsphere index for geospatial querying
postSchema.index({ location: '2dsphere' });

// Virtual for comment count
postSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

// Virtual for like count
postSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Index for better query performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ isPinned: -1, createdAt: -1 });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
