const express = require('express');
const router = express.Router();
const { 
  createThought, 
  getThoughts, 
  toggleLikeThought, 
  toggleDislikeThought, 
  addComment, 
  updateThought, 
  deleteThought 
} = require('../controllers/thoughtController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/', createThought);
router.get('/', getThoughts);

// Protected routes (require authentication)
router.post('/:id/like', protect, toggleLikeThought);
router.post('/:id/dislike', protect, toggleDislikeThought);
router.post('/:id/comments', protect, addComment);
router.put('/:id', protect, updateThought);
router.delete('/:id', protect, deleteThought);

module.exports = router;
