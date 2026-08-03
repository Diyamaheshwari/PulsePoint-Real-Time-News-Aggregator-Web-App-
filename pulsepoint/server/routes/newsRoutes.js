/**
 * NewsSphere – News Routes (Global Feed)
 */
const express = require('express');
const router = express.Router();
const {
  getGlobalFeed, getArticle, summariseArticle,
  trackEngagement, getCategories, getTrending, getDateRange
} = require('../controllers/newsController');
const { protect, optionalAuth } = require('../middleware/auth');

// Public / optionally-authenticated
router.get('/feed', optionalAuth, getGlobalFeed);
router.get('/categories', getCategories);
router.get('/trending', getTrending);
router.get('/date-range', getDateRange); // Returns min/max dates in DB
router.get('/:id', getArticle);

// Protected
router.post('/:id/summarise', protect, summariseArticle);
router.post('/:id/engagement', protect, trackEngagement);

module.exports = router;
