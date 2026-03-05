require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function getOrCreateAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if admin user exists
    const adminEmail = 'admin@pulsepoint.in';
    let admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      console.log('Admin user not found. Creating one...');
      // Create admin user
      admin = new User({
        username: 'admin',
        email: adminEmail,
        password: 'Admin@123',
        role: 'admin',
        isVerified: true
      });

      await admin.save();
      console.log('Admin user created successfully!');
    }

    console.log('\nAdmin User Details:');
    console.log('------------------');
    console.log(`ID: ${admin._id}`);
    console.log(`Email: ${admin.email}`);
    console.log('Role: admin');
    console.log('\nCopy the ID above and update your .env file with:');
    console.log(`ADMIN_USER_ID=${admin._id}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

getOrCreateAdmin();
