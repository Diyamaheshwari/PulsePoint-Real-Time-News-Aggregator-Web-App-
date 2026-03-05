const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

async function checkUserData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find admin user with password field
    const admin = await User.findOne({ email: 'admin@pulsepoint.in' }).select('+password');
    
    if (!admin) {
      console.log('Admin user not found');
      return;
    }

    console.log('Admin user details:');
    console.log({
      _id: admin._id,
      email: admin.email,
      username: admin.username,
      role: admin.role,
      passwordExists: !!admin.password,
      passwordLength: admin.password ? admin.password.length : 0,
      passwordStartsWith: admin.password ? admin.password.substring(0, 10) + '...' : 'N/A'
    });

    // Test password comparison
    if (admin.password) {
      const isMatch = await admin.comparePassword('Admin@123');
      console.log('Password comparison result:', isMatch);
    }

  } catch (error) {
    console.error('Error checking user data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkUserData();
