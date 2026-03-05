const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Poll = require('../models/Poll');
const User = require('../models/User');

// Load environment variables
dotenv.config();

// Sample polls data
const samplePolls = [
  {
    question: "What's your favorite programming language?",
    description: "Let's see which programming language is the most popular among our community!",
    options: [
      { text: 'JavaScript' },
      { text: 'Python' },
      { text: 'Java' },
      { text: 'C++' },
      { text: 'Other' }
    ],
    tags: ['programming', 'languages', 'development']
  },
  {
    question: "How many hours do you code per day?",
    description: "Curious about the coding habits of our community members.",
    options: [
      { text: 'Less than 1 hour' },
      { text: '1-3 hours' },
      { text: '3-6 hours' },
      { text: '6-9 hours' },
      { text: 'More than 9 hours' }
    ],
    tags: ['lifestyle', 'habits', 'coding']
  },
  {
    question: "Which frontend framework do you prefer?",
    description: "Let's settle the debate on the best frontend framework!",
    options: [
      { text: 'React' },
      { text: 'Vue' },
      { text: 'Angular' },
      { text: 'Svelte' },
      { text: 'None of the above' }
    ],
    tags: ['frontend', 'frameworks', 'web development']
  },
  {
    question: "How do you prefer to learn new technologies?",
    description: "Share your preferred learning methods with the community!",
    options: [
      { text: 'Online courses' },
      { text: 'Documentation' },
      { text: 'Video tutorials' },
      { text: 'Building projects' },
      { text: 'Books' }
    ],
    tags: ['learning', 'education', 'development']
  },
  {
    question: "Which operating system do you use for development?",
    description: "Let's see which OS is most popular among developers!",
    options: [
      { text: 'Windows' },
      { text: 'macOS' },
      { text: 'Linux' },
      { text: 'Other' }
    ],
    tags: ['development', 'tools', 'operating system']
  }
];

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Seed the database with sample polls
const seedPolls = async () => {
  try {
    // Connect to the database
    await connectDB();

    // Get the first user as the creator of the polls
    const user = await User.findOne().sort({ createdAt: 1 });
    
    if (!user) {
      console.error('No users found. Please create a user first.');
      process.exit(1);
    }

    // Clear existing polls
    await Poll.deleteMany({});
    console.log('Cleared existing polls');

    // Add sample polls
    const polls = samplePolls.map(poll => ({
      ...poll,
      createdBy: user._id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      isActive: true
    }));

    await Poll.insertMany(polls);
    console.log('Successfully added sample polls!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding polls:', error);
    process.exit(1);
  }
};

// Run the seed function
seedPolls();
