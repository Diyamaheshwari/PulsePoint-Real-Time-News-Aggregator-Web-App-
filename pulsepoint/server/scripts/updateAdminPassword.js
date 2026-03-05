const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('../models/User');

async function updateAdminPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // First, check if admin exists
    let admin = await User.findOne({ email: 'admin@pulsepoint.in' });
    
    if (!admin) {
      // Create new admin user if doesn't exist
      admin = new User({
        username: 'admin',
        email: 'admin@pulsepoint.in',
        password: 'Admin@123', // This will be hashed by the pre-save hook
        role: 'admin'
      });
      await admin.save();
    } else {
      // Update existing admin password using direct update to bypass any hooks
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin@123', salt);
      
      await User.updateOne(
        { _id: admin._id },
        {
          $set: {
            username: 'admin',
            email: 'admin@pulsepoint.in',
            password: hashedPassword,
            role: 'admin'
          }
        },
        { runValidators: true }
      );
      
      // Refresh the admin object
      admin = await User.findById(admin._id).select('+password');
    }

    console.log('Admin user updated successfully:', {
      _id: admin._id,
      email: admin.email,
      role: admin.role
    });

  } catch (error) {
    console.error('Error updating admin password:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

updateAdminPassword();
