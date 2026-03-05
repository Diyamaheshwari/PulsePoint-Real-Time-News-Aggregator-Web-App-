const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { info, error: logError } = require('../utils/logger');

// Cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // Enable in production with HTTPS
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/'
};

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      logError('REGISTRATION_FAILED', null, req.ip, { email, reason: 'User already exists' });
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      role: email === 'admin@pulsepoint.in' ? 'admin' : 'user'
    });

    // Log successful registration
    info('USER_REGISTERED', user._id, req.ip, { 
      email, 
      role: user.role,
      registrationDate: new Date().toISOString() 
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    // Set HTTP-only cookie
    res.cookie('token', token, cookieOptions);

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      logError('LOGIN_FAILED', null, req.ip, { email, reason: 'User not found' });
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' // Don't reveal if user exists or not
      });
    }

    // Check password
    if (!user.password) {
      console.error('User password is missing in database');
      logError('LOGIN_ERROR', user._id, req.ip, { error: 'Password missing in database' });
      return res.status(500).json({ 
        success: false,
        message: 'Internal server error' 
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logError('LOGIN_FAILED', user._id, req.ip, { email, reason: 'Invalid password' });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    // Set HTTP-only cookie
    res.cookie('token', token, {
      ...cookieOptions,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
      httpOnly: true
    });
    
    // Also set a non-httpOnly cookie for client-side checks if needed
    res.cookie('isLoggedIn', 'true', {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    });

    // Log successful login
    info('USER_LOGGED_IN', user._id, req.ip, { 
      email: user.email, 
      role: user.role, 
      loginTime: new Date().toISOString() 
    });

    // Return both token and user data in the expected format
    res.json({
      success: true,
      token: token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    logError('LOGIN_ERROR', null, req.ip, { 
      email: req.body.email, 
      error: error.message,
      stack: error.stack 
    });
    
    // More specific error messages
    if (error.message.includes('Illegal arguments')) {
      return res.status(400).json({ message: 'Invalid password format' });
    }
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update username if provided
    if (username) user.username = username;
    
    // Update email if provided
    if (email) user.email = email;

    // If changing password
    if (currentPassword && newPassword) {
      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        logError('PASSWORD_UPDATE_FAILED', user._id, req.ip, { reason: 'Incorrect current password' });
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Set new password (pre-save hook will hash it)
      user.password = newPassword;
      
      // Log password change
      info('PASSWORD_UPDATED', user._id, req.ip, { 
        timestamp: new Date().toISOString() 
      });
    }

    // Save the updated user
    const updatedUser = await user.save();

    // Remove password from response
    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      user: userResponse,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    logError('PROFILE_UPDATE_ERROR', req.user?._id, req.ip, { 
      error: error.message,
      stack: error.stack 
    });
    res.status(500).json({ message: 'Error updating profile' });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
exports.logout = (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0)
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Create admin user
// @route   POST /api/auth/create-admin
// @access  Public (should be removed in production)
exports.createAdmin = async (req, res) => {
  try {
    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'admin@pulsepoint.in' });
    if (adminExists) {
      return res.status(400).json({ message: 'Admin user already exists' });
    }

    // Create admin user
    const admin = await User.create({
      username: 'admin',
      email: 'admin@pulsepoint.in',
      password: 'Admin@123',
      role: 'admin'
    });

    res.status(201).json({
      message: 'Admin user created successfully',
      user: {
        _id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
