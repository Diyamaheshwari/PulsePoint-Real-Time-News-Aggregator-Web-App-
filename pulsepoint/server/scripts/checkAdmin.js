const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

async function checkAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find admin user
    const admin = await User.findOne({ email: 'admin@pulsepoint.in' }).select('+password');
    
    if (!admin) {
      console.log('Admin user not found');
      return;
    }

    console.log('Admin user found:');
    console.log({
      _id: admin._id,
      email: admin.email,
      role: admin.role,
      passwordExists: !!admin.password,
      passwordLength: admin.password ? admin.password.length : 0
    });

    // Test password
    const isMatch = await admin.comparePassword('Admin@123');
    console.log('Password match:', isMatch);

  } catch (error) {
    console.error('Error checking admin:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkAdmin();
