/**
 * NewsSphere – Local Feed Routes
 */
const express = require('express');
const router = express.Router();
const {
  getLocalFeed, createLocalPost, getPost,
  toggleLike, flagPost
} = require('../controllers/localFeedController');
const { getFollowingFeed } = require('../controllers/followingFeedController');
const { protect, optionalAuth, shadowBanGuard } = require('../middleware/auth');

// Optionally authenticated – logged-in users get personalised radius
router.get('/feed', optionalAuth, getLocalFeed);
router.get('/post/:id', getPost);

// Protected
router.get('/following', protect, getFollowingFeed);
router.post('/post', protect, shadowBanGuard, createLocalPost);
router.post('/post/:id/like', protect, toggleLike);
router.post('/post/:id/flag', protect, flagPost);

module.exports = router;
