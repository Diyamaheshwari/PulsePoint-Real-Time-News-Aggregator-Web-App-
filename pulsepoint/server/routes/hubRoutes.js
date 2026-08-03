const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getCommunities,
  createCommunity,
  toggleJoinCommunity,
  getCommunityDetails,
  getCommunityPosts,
  createCommunityPost
} = require('../controllers/communityHubController');

// Public route to browse communities
router.get('/', getCommunities);
router.get('/:id', getCommunityDetails);
router.get('/:id/posts', getCommunityPosts);

// Protected routes
router.post('/', protect, createCommunity);
router.post('/:id/join', protect, toggleJoinCommunity);
router.post('/:id/posts', protect, createCommunityPost);

module.exports = router;
