const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'journalist', 'admin'],
    default: 'user'
  },
  isJournalistVerified: {
    type: Boolean,
    default: false
  },
  preferences: [{
    type: String,
    enum: ['Politics', 'Sports', 'Technology', 'Business', 'Science', 'Entertainment', 'Health', 'General'],
    default: 'General'
  }],
  language: {
    type: String,
    default: 'en'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  radius: {
    type: Number, // user defined radius in km
    default: 10
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  trustScore: {
    type: Number,
    default: 0
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  shadowBanned: {
    type: Boolean,
    default: false
  },
  savedArticles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'News'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create 2dsphere index for location queries
userSchema.index({ location: '2dsphere' });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    if (!candidatePassword || typeof candidatePassword !== 'string') {
      console.error('Invalid password format in comparePassword');
      return false;
    }
    if (!this.password) {
      console.error('No password set for this user');
      return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Error in comparePassword:', error);
    throw error;
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;
