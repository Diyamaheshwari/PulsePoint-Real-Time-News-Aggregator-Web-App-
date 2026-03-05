const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// User model
const User = require('../models/User');

const createAdmin = async () => {
  try {
    const adminData = {
      username: 'admin',
      email: 'admin@pulsepoint.in',
      password: 'admin123', // Change this to a secure password in production
      role: 'admin'
    };

    // Check if admin already exists
    const adminExists = await User.findOne({ email: adminData.email });
    if (adminExists) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const user = new User(adminData);
    await user.save();
    
    console.log('Admin user created successfully');
    console.log('Email: admin@pulsepoint.in');
    console.log('Password: admin123');
    console.log('\nIMPORTANT: Please change the default password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdmin();
