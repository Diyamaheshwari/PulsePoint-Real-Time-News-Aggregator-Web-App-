const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  addComment,
  getComments,
  addReaction,
  getReactions,
  getUserReactions
} = require('../controllers/newsInteractionController');

// Validation middleware
const validateComment = [
  check('content', 'Comment content is required').not().isEmpty().trim().escape()
];

const validateReaction = [
  check('type', 'Reaction type is required')
    .isIn(['like', 'angry', 'sad', 'support'])
    .withMessage('Invalid reaction type')
];

const validateArticleIds = [
  check('articleIds', 'articleIds must be an array').isArray(),
  check('articleIds.*', 'Invalid article ID').isString().not().isEmpty()
];

// @desc    Add a comment to an article
// @route   POST /api/news/:articleId/comments
// @access  Private
router.post(
  '/:articleId/comments', 
  protect, 
  validateComment,
  addComment
);

// @desc    Get comments for an article
// @route   GET /api/news/:articleId/comments
// @access  Public
router.get('/:articleId/comments', getComments);

// @desc    Add or update a reaction to an article
// @route   POST /api/news/:articleId/reactions
// @access  Private
router.post(
  '/:articleId/reactions', 
  protect, 
  validateReaction,
  addReaction
);

// @desc    Get reactions for an article
// @route   GET /api/news/:articleId/reactions
// @access  Public
router.get('/:articleId/reactions', getReactions);

// @desc    Get user reactions for multiple articles
// @route   POST /api/news/reactions/user
// @access  Private
router.post(
  '/reactions/user',
  protect,
  validateArticleIds,
  getUserReactions
);

module.exports = router;
