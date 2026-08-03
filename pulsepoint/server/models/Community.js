const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: [50, 'Community name cannot exceed 50 characters']
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [300, 'Description cannot exceed 300 characters']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  category: {
    type: String,
    enum: ['Politics', 'Technology', 'Sports', 'Local Issues', 'Entertainment', 'Health', 'General'],
    default: 'General'
  },
  isLocal: {
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
    }
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for member count
communitySchema.virtual('memberCount').get(function() {
  return this.members ? this.members.length : 0;
});

// Geospatial index if needed later for discovering local communities
communitySchema.index({ location: '2dsphere' });
communitySchema.index({ name: 'text', description: 'text' });

const Community = mongoose.model('Community', communitySchema);

module.exports = Community;
