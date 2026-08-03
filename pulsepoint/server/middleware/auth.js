/**
 * NewsSphere – Enhanced Auth Middleware
 * 
 * Supports:
 *  - Access token from Bearer header or HTTP-only cookie
 *  - Token rotation via TokenService
 *  - Role-based access control (RBAC) with multi-role guards
 *  - Shadow-ban check (shadow-banned users can read but not write)
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const tokenService = require('../services/tokenService');
const { logError } = require('../utils/logger');

// ── Protect: verify JWT and attach user ────────────────────────
exports.protect = async (req, res, next) => {
  let token;

  // 1. Try Bearer header
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. Fallback to cookie
  else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    // Verify via TokenService (uses access secret)
    const decoded = tokenService.verifyAccessToken(token);
    if (!decoded) {
      // Also try legacy JWT_SECRET for backward compatibility
      try {
        const legacyDecoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(legacyDecoded.id).select('-password');
      } catch (_) {
        return res.status(401).json({ success: false, message: 'Token expired or invalid' });
      }
    } else {
      req.user = await User.findById(decoded.id).select('-password');
    }

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    next();
  } catch (error) {
    console.error('[Auth] Middleware error:', error.message);
    if (logError) logError('AUTH_MIDDLEWARE_ERROR', null, req.ip, { error: error.message });
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

// ── Authorize: role-based guard ────────────────────────────────
// Usage: authorize('admin', 'moderator')
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized for this action`
      });
    }
    next();
  };
};

// ── Admin shorthand ────────────────────────────────────────────
exports.admin = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Admin access required' });
};

// ── Moderator or Admin ─────────────────────────────────────────
exports.moderatorOrAdmin = (req, res, next) => {
  if (['admin', 'moderator'].includes(req.user?.role)) return next();
  return res.status(403).json({ success: false, message: 'Moderator access required' });
};

// ── Shadow-ban write guard ─────────────────────────────────────
// Shadow-banned users can still read, but writes are silently accepted
// (the data is not actually persisted — a "soft" shadow-ban pattern).
exports.shadowBanGuard = (req, res, next) => {
  if (req.user?.shadowBanned) {
    // Return a fake success so the client thinks it worked
    return res.status(200).json({ success: true, _shadowBanned: true });
  }
  next();
};

// ── Optional auth: attach user if token present but don't block ──
exports.optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = tokenService.verifyAccessToken(token) ||
        jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.id) {
        req.user = await User.findById(decoded.id).select('-password');
      }
    } catch (_) {
      // Silently continue as unauthenticated
    }
  }
  next();
};
