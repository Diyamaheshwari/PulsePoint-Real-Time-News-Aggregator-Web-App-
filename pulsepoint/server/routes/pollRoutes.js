// In server/routes/pollRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const pollController = require('../controllers/pollController');
const {
  createPollValidation,
  voteValidation,
  pollIdValidation,
  updatePollValidation
} = require('../middleware/pollValidation');

// All routes that modify data should be protected
router.post('/', protect, createPollValidation, pollController.createPoll);
router.post('/:id/vote', protect, voteValidation, pollController.voteOnPoll);
router.put('/:id', protect, updatePollValidation, pollController.updatePoll);
router.delete('/:id', protect, pollController.deletePoll);

// Read-only endpoints can remain public
router.get('/', pollController.getPolls);
router.get('/:id/results', pollIdValidation, pollController.getPollResults);

module.exports = router;