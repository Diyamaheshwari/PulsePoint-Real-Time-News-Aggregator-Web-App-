/**
 * NewsSphere – Moderation Routes
 */
const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getFlaggedPosts, approvePost, removePost,
  shadowBanUser, verifyJournalist, revokeJournalist,
  changeUserRole, getUsers
} = require('../controllers/moderationController');
const { protect, moderatorOrAdmin, admin } = require('../middleware/auth');

// All moderation routes require at least moderator access
router.use(protect);
router.use(moderatorOrAdmin);

// Dashboard
router.get('/stats', getDashboardStats);
router.get('/users', getUsers);

// Content moderation
router.get('/flagged-posts', getFlaggedPosts);
router.patch('/posts/:id/approve', approvePost);
router.delete('/posts/:id', removePost);

// User moderation
router.patch('/users/:userId/shadow-ban', shadowBanUser);
router.patch('/users/:userId/verify-journalist', admin, verifyJournalist);
router.patch('/users/:userId/revoke-journalist', admin, revokeJournalist);
router.patch('/users/:userId/role', admin, changeUserRole);

module.exports = router;
