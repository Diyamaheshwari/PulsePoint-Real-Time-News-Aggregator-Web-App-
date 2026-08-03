const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    trim: true
  },
  url: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  urlToImage: {
    type: String,
    default: ''
  },
  publishedAt: {
    type: Date,
    required: true,
    index: true
  },
  source: {
    id: { type: String, default: null },
    name: { type: String, required: true }
  },
  category: {
    type: String,
    enum: ['Politics', 'Sports', 'Technology', 'Business', 'Science', 'Entertainment', 'Health', 'General'],
    default: 'General',
    index: true
  },
  language: {
    type: String,
    default: 'en'
  },
  country: {
    type: String,
    default: 'us'
  },
  sentiment: {
    type: String,
    enum: ['Positive', 'Neutral', 'Negative'],
    default: 'Neutral',
    index: true
  },
  sentimentScore: {
    type: Number,
    default: 0
  },
  summary: {
    type: String,
    default: ''
  },
  factCheckScore: {
    type: Number, // ClaimBuster rating (0-100)
    default: null
  },
  factCheckLabel: {
    type: String,
    enum: ['Verified', 'Unverified', 'Disputed', 'Needs Verification'],
    default: 'Needs Verification'
  },
  engagementScore: {
    type: Number,
    default: 0,
    index: true
  },
  clicks: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  likesCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for full-text search on title and description
newsSchema.index({ title: 'text', description: 'text' });

// Index to support sorting by published date and relevance ranking
newsSchema.index({ category: 1, publishedAt: -1 });

const News = mongoose.model('News', newsSchema);

module.exports = News;
