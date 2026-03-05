const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createPost,
  getPosts,
  createComment,
  getPostComments,
  toggleLike,
  createPoll,
  voteInPoll,
  getActivePolls,
  generateDailyPoll
} = require('../controllers/communityController');

// Post routes
router.route('/posts')
  .post(protect, createPost)
  .get(getPosts);

// Comment routes
router.route('/posts/:postId/comments')
  .post(protect, createComment)
  .get(getPostComments);

// Reaction routes
router.post('/:type/:id/like', protect, toggleLike);

// Poll routes
router.route('/polls')
  .post(protect, createPoll)
  .get(getActivePolls);

router.post('/polls/:pollId/vote', protect, voteInPoll);
router.get('/polls/daily', generateDailyPoll);

module.exports = router;
