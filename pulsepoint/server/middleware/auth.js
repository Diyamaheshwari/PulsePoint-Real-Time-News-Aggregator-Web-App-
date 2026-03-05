const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger, logError } = require('../utils/logger');

// Middleware to protect routes
exports.protect = async (req, res, next) => {
  let token;

  // Check Authorization header first
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // Then check cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (process.env.NODE_ENV !== 'production') {
    console.log('No token found in request');
  }

  if (!token) {
    logError('AUTH_ERROR', null, req.ip, { error: 'No token provided' });
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Only log in development
      if (process.env.NODE_ENV !== 'production') {
        console.log('Token verified for user:', decoded.id);
      }
    } catch (error) {
      logError('TOKEN_VERIFICATION_FAILED', null, req.ip, { error: error.message });
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }

    // Get user from the token
    try {
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        console.error('User not found for token:', decoded.id);
        logError('AUTH_ERROR', null, req.ip, { error: 'User not found', userId: decoded.id });
        return res.status(401).json({ message: 'User not found' });
      }
      console.log('User found:', { id: req.user._id, username: req.user.username });
    } catch (error) {
      console.error('Error finding user:', error);
      logError('USER_LOOKUP_ERROR', null, req.ip, { error: error.message, userId: decoded.id });
      return res.status(500).json({ message: 'Server error during authentication' });
    }
    
    // Attach user to request object
    req.user = {
      _id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // Use logger if available, otherwise use console.error
    if (logError) {
      logError('TOKEN_VERIFICATION_FAILED', null, req.ip, { error: error.message });
    } else {
      console.error('TOKEN_VERIFICATION_FAILED:', error.message);
    }
    
    // Clear invalid token cookie if it exists
    if (req.cookies && req.cookies.token) {
      res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0),
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
    }
    
    // Clear Authorization header if present
    if (req.headers.authorization) {
      delete req.headers.authorization;
    }
    
    return res.status(401).json({ 
      success: false,
      message: 'Not authorized, please log in again',
      error: error.message 
    });
  }
};

// Middleware to check if user is admin
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};
