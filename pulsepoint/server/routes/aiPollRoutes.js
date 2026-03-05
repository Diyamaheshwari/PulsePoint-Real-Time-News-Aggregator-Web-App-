const express = require('express');
const router = express.Router();
const { generatePolls, getTodaysPolls } = require('../controllers/aiPollController');

// @desc    Generate daily polls
// @route   POST /api/ai-polls/generate
// @access  Public (temporarily, for setup)
router.post('/generate', generatePolls);

// @desc    Get today's active polls
// @route   GET /api/ai-polls/today
// @access  Public
router.get('/today', getTodaysPolls);

module.exports = router;
