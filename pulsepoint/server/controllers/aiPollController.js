const { generateDailyPolls } = require('../services/aiPollService');
const Poll = require('../models/Poll');

// Controller to manually trigger poll generation (for testing)
exports.generatePolls = async (req, res) => {
  try {
    // Check if polls were already generated today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingPolls = await Poll.find({
      createdAt: { $gte: today },
      isDailyPoll: true
    });

    if (existingPolls.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Polls were already generated today',
        polls: existingPolls
      });
    }

    const newPolls = await generateDailyPolls();
    
    res.status(201).json({
      success: true,
      message: 'Successfully generated daily polls',
      polls: newPolls
    });
  } catch (error) {
    console.error('Error in generatePolls:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate polls',
      error: error.message
    });
  }
};

// Get today's active polls
exports.getTodaysPolls = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const polls = await Poll.find({
      createdAt: { $gte: today },
      isDailyPoll: true,
      isActive: true
    }).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: polls.length,
      polls
    });
  } catch (error) {
    console.error('Error getting today\'s polls:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s polls',
      error: error.message
    });
  }
};
