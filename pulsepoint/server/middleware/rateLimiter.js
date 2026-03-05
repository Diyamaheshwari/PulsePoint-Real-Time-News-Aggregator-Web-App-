const rateLimit = require('express-rate-limit');

// Rate limiting configuration
const isDevelopment = process.env.NODE_ENV === 'development';

const apiLimiter = rateLimit({
    windowMs: isDevelopment ? 60 * 1000 : 15 * 60 * 1000, // 1 min in dev, 15 min in prod
    max: isDevelopment ? 1000 : 100, // 1000 in dev, 100 in prod
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
        success: false, 
        message: 'Too many requests, please try again later.' 
    },
    skip: (req) => {
        // Skip rate limiting in development for all routes
        if (isDevelopment) return true;
        return req.path === '/api/health' || 
               req.path.startsWith('/api/auth/refresh-token');
    }
});

// More aggressive rate limiting for authentication endpoints
const authLimiter = rateLimit({
    windowMs: isDevelopment ? 5 * 60 * 1000 : 60 * 60 * 1000, // 5 min in dev, 1 hour in prod
    max: isDevelopment ? 100 : 10, // 100 in dev, 10 in prod
    message: {
        success: false,
        message: isDevelopment 
            ? 'Too many login attempts, please wait a few minutes.'
            : 'Too many login attempts, please try again after an hour.'
    }
});

module.exports = {
    apiLimiter,
    authLimiter
};
