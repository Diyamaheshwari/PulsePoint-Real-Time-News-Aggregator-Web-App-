/**
 * NewsSphere – Auth Routes
 */
const express = require('express');
const router = express.Router();
const {
  register, login, logout, refreshToken,
  getMe, updateProfile, completeOnboarding,
  toggleFollow, googleCallback, createAdmin,
  getUserProfile, verifyReporter,
  toggleBookmark, getBookmarks, getNetworkUsers
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.get('/profile/:id', getUserProfile);

// Protected
router.get('/me', protect, getMe);
router.get('/network-users', protect, getNetworkUsers);
router.put('/profile', protect, updateProfile);
router.post('/onboarding', protect, completeOnboarding);
router.post('/follow/:userId', protect, toggleFollow);
router.post('/verify-reporter', protect, verifyReporter);
router.post('/bookmark/:id', protect, toggleBookmark);
router.get('/bookmarks', protect, getBookmarks);

// Google OAuth
let passport;
try {
  passport = require('../config/passport');
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=oauth_failed', session: false }),
    googleCallback
  );
} catch (_) {
  // Passport or Google strategy not available
}

// Dev only
if (process.env.NODE_ENV === 'development') {
  router.post('/create-admin', createAdmin);
}

module.exports = router;
