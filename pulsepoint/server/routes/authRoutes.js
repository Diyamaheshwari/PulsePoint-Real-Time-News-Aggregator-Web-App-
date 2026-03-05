const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  logout,
  getUserProfile,
  updateUserProfile,
  createAdmin 
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/create-admin', createAdmin); // This should be removed in production

// Protected routes
router.get('/me', protect, getUserProfile); // Add this line
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

module.exports = router;
