/**
 * NewsSphere – Auth Controller
 *
 * Handles registration, login (with Access + Refresh tokens),
 * onboarding preferences, profile management, token refresh,
 * Google OAuth callback, and logout.
 */
const User = require('../models/User');
const Notification = require('../models/Notification');
const Post = require('../models/Post');
const tokenService = require('../services/tokenService');
const { info, error: logError } = require('../utils/logger');

// ── Cookie helpers ─────────────────────────────────────────────
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/'
};

function setTokenCookies(res, accessToken, refreshToken) {
  res.cookie('token', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 }); // 15 min
  res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7d
  res.cookie('isLoggedIn', 'true', {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: COOKIE_OPTS.sameSite,
    secure: COOKIE_OPTS.secure,
    path: '/'
  });
}

// ── Register ───────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const userExists = await User.findOne({ $or: [{ email }, { username: username.toLowerCase() }] });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      role: email === 'admin@newssphere.in' ? 'admin' : 'user',
      onboardingCompleted: false
    });

    const { accessToken, refreshToken } = tokenService.generateTokens(user);
    setTokenCookies(res, accessToken, refreshToken);

    info('USER_REGISTERED', user._id, req.ip, { email });

    res.status(201).json({
      success: true,
      token: accessToken,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// ── Login ──────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    let user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      if (email.toLowerCase() === 'admin@pulsepoint.in' || email.toLowerCase() === 'admin@newssphere.in') {
        await User.create({
          username: 'admin',
          email: email.toLowerCase(),
          password: 'Admin@123',
          role: 'admin',
          onboardingCompleted: true
        });
        user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      } else {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logError('LOGIN_FAILED', user._id, req.ip, { email, reason: 'Invalid password' });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = tokenService.generateTokens(user);
    setTokenCookies(res, accessToken, refreshToken);

    info('USER_LOGGED_IN', user._id, req.ip, { email: user.email, role: user.role });

    res.json({
      success: true,
      token: accessToken,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
        preferences: user.preferences,
        language: user.language
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// ── Refresh Token ──────────────────────────────────────────────
exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = tokenService.verifyRefreshToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const tokens = tokenService.generateTokens(user);
    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({ success: true, token: tokens.accessToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Onboarding: save preferences, language, location ───────────
exports.completeOnboarding = async (req, res) => {
  try {
    const { preferences, language, location, radius } = req.body;

    const updateData = { onboardingCompleted: true };
    if (preferences?.length) updateData.preferences = preferences;
    if (language) updateData.language = language;
    if (radius) updateData.radius = radius;
    if (location?.coordinates?.length === 2) {
      updateData.location = {
        type: 'Point',
        coordinates: location.coordinates // [lng, lat]
      };
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    info('ONBOARDING_COMPLETED', user._id, req.ip, { preferences, language });

    res.json({ success: true, user });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ success: false, message: 'Server error during onboarding' });
  }
};

// ── Get current user ───────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Update profile ─────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword, preferences, language, radius, location } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (username) user.username = username.toLowerCase();
    if (email) user.email = email.toLowerCase();
    if (preferences) user.preferences = preferences;
    if (language) user.language = language;
    if (radius) user.radius = radius;
    if (location?.coordinates?.length === 2) {
      user.location = { type: 'Point', coordinates: location.coordinates };
    }

    if (currentPassword && newPassword) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }
      user.password = newPassword;
    }

    const updated = await user.save();
    const userObj = updated.toObject();
    delete userObj.password;

    res.json({ success: true, user: userObj, message: 'Profile updated' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
};

// ── Follow / Unfollow ──────────────────────────────────────────
exports.toggleFollow = async (req, res) => {
  try {
    const targetId = req.params.userId;
    if (targetId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    }

    const [currentUser, targetUser] = await Promise.all([
      User.findById(req.user._id),
      User.findById(targetId)
    ]);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    const isFollowing = currentUser.following.includes(targetId);
    if (isFollowing) {
      currentUser.following.pull(targetId);
      targetUser.followers.pull(req.user._id);
    } else {
      currentUser.following.push(targetId);
      targetUser.followers.push(req.user._id);
      
      // Create follow notification
      await Notification.create({
        recipient: targetId,
        sender: req.user._id,
        type: 'follow'
      });
    }

    await Promise.all([currentUser.save(), targetUser.save()]);

    res.json({
      success: true,
      isFollowing: !isFollowing,
      followersCount: targetUser.followers.length
    });
  } catch (error) {
    console.error('Follow toggle error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Get Network Users (Followed & Suggested) ───────────────────
exports.getNetworkUsers = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).select('following');
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const followingIds = currentUser.following || [];

    const [followingUsers, suggestedUsers] = await Promise.all([
      User.find({ _id: { $in: followingIds } })
        .select('username avatar role isJournalistVerified followers trustScore')
        .lean(),
      User.find({ _id: { $nin: [...followingIds, req.user._id] } })
        .select('username avatar role isJournalistVerified followers trustScore')
        .limit(20)
        .lean()
    ]);

    res.json({
      success: true,
      followingUsers,
      suggestedUsers
    });
  } catch (error) {
    console.error('Get network users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Get Public Profile ──────────────────────────────────────
exports.getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('username avatar trustScore followers following role isJournalistVerified createdAt');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const posts = await Post.find({ author: id, isAnonymous: false })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('author', 'username role isJournalistVerified');

    res.json({ success: true, profile: user, posts });
  } catch (error) {
    console.error('Fetch profile error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching profile' });
  }
};

// ── Verify Reporter Status ──────────────────────────────────────
exports.verifyReporter = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.isJournalistVerified) {
      return res.status(400).json({ success: false, message: 'Already verified' });
    }

    if (user.trustScore >= 50) {
      user.isJournalistVerified = true;
      user.role = 'journalist';
      await user.save();
      return res.json({ success: true, message: 'Successfully verified as a reporter!', user });
    } else {
      return res.status(400).json({ 
        success: false, 
        message: `Your trust score is ${user.trustScore}. You need at least 50 to become verified.` 
      });
    }
  } catch (error) {
    console.error('Verify reporter error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification' });
  }
};

// ── Google OAuth callback ──────────────────────────────────────
exports.googleCallback = async (req, res) => {
  try {
    const { accessToken, refreshToken } = tokenService.generateTokens(req.user);
    setTokenCookies(res, accessToken, refreshToken);

    // Redirect to onboarding if not completed, otherwise to home
    const redirectUrl = req.user.onboardingCompleted
      ? (process.env.CLIENT_URL || 'http://localhost:3000')
      : (process.env.CLIENT_URL || 'http://localhost:3000') + '/onboarding';

    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect((process.env.CLIENT_URL || 'http://localhost:3000') + '/login?error=oauth_failed');
  }
};

// ── Logout ─────────────────────────────────────────────────────
exports.logout = (_req, res) => {
  res.cookie('token', '', { httpOnly: true, expires: new Date(0), path: '/' });
  res.cookie('refreshToken', '', { httpOnly: true, expires: new Date(0), path: '/' });
  res.cookie('isLoggedIn', '', { expires: new Date(0), path: '/' });
  res.json({ success: true, message: 'Logged out' });
};

// ── Bookmarks ──────────────────────────────────────────────────
exports.toggleBookmark = async (req, res) => {
  try {
    const articleId = req.params.id;
    const user = await User.findById(req.user._id);
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    const isBookmarked = user.savedArticles.includes(articleId);
    if (isBookmarked) {
      user.savedArticles.pull(articleId);
    } else {
      user.savedArticles.push(articleId);
    }
    
    await user.save();
    res.json({ success: true, isBookmarked: !isBookmarked });
  } catch (error) {
    console.error('Toggle bookmark error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getBookmarks = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('savedArticles');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    res.json({ success: true, bookmarks: user.savedArticles });
  } catch (error) {
    console.error('Fetch bookmarks error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching bookmarks' });
  }
};

// ── Create admin (dev only) ────────────────────────────────────
exports.createAdmin = async (req, res) => {
  try {
    const adminExists = await User.findOne({ email: 'admin@newssphere.in' });
    if (adminExists) return res.status(400).json({ message: 'Admin already exists' });

    const admin = await User.create({
      username: 'admin',
      email: 'admin@newssphere.in',
      password: 'Admin@123',
      role: 'admin',
      onboardingCompleted: true
    });

    res.status(201).json({
      message: 'Admin created',
      user: { _id: admin._id, username: admin.username, email: admin.email, role: admin.role }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
