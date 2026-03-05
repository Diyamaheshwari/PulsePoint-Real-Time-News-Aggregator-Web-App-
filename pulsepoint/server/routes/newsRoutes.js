const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getTopHeadlines, searchNews, getTopCategories, getMostViewed } = require('../controllers/newsController');

// Public routes (no authentication required)
router.get('/headlines', getTopHeadlines);
router.get('/search', searchNews);
router.get('/top-categories', getTopCategories);
router.get('/most-viewed', getMostViewed);

module.exports = router;
