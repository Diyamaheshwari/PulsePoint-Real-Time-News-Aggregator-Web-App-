/**
 * NewsSphere – Comment Routes
 */
const express = require('express');
const router = express.Router();
const {
  getComments, addComment, toggleCommentLike, deleteComment
} = require('../controllers/commentController');
const { protect, shadowBanGuard } = require('../middleware/auth');

// Public
router.get('/:targetType/:targetId', getComments);

// Protected
router.post('/:targetType/:targetId', protect, shadowBanGuard, addComment);
router.post('/:commentId/like', protect, toggleCommentLike);
router.delete('/:commentId', protect, deleteComment);

module.exports = router;
