const mongoose = require('mongoose');

const pollOptionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  voters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

const pollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
    maxlength: [300, 'Question cannot be more than 300 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  options: [pollOptionSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDailyPoll: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  totalVotes: {
    type: Number,
    default: 0
  },
  // For AI-generated polls
  isAIGenerated: {
    type: Boolean,
    default: false
  },
  aiPrompt: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
pollSchema.index({ expiresAt: 1 });
pollSchema.index({ isActive: 1, isDailyPoll: 1, createdAt: -1 });
pollSchema.index({ tags: 1 });

// Virtual for checking if poll is expired
pollSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

// Method to add a vote
pollSchema.methods.addVote = async function(optionIndex, userId) {
  // Check if user already voted in this poll
  const hasVoted = this.options.some(option => 
    option.voters.some(voter => voter.equals(userId))
  );
  
  if (hasVoted) {
    throw new Error('User has already voted in this poll');
  }

  if (optionIndex < 0 || optionIndex >= this.options.length) {
    throw new Error('Invalid option index');
  }

  this.options[optionIndex].voters.push(userId);
  this.totalVotes += 1;
  return this.save();
};

// Method to get poll results
pollSchema.methods.getResults = function() {
  const results = {
    totalVotes: this.totalVotes,
    options: this.options.map(option => ({
      text: option.text,
      votes: option.voters.length,
      percentage: this.totalVotes > 0 
        ? Math.round((option.voters.length / this.totalVotes) * 100) 
        : 0
    }))
  };
  
  return results;
};

const Poll = mongoose.model('Poll', pollSchema);

module.exports = Poll;
