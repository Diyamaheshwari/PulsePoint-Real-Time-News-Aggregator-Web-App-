const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Community = require('./models/Community');
const Post = require('./models/Post');
const Comment = require('./models/Comment');

const usersData = [
  { username: 'j_smith', email: 'jsmith@example.com', password: 'password123', role: 'journalist', bio: 'Tech Reporter', onboardingCompleted: true },
  { username: 'news_hound', email: 'hound@example.com', password: 'password123', role: 'journalist', bio: 'Investigative Journalist', onboardingCompleted: true },
  { username: 'politics_insider', email: 'pol@example.com', password: 'password123', role: 'journalist', bio: 'Politics & Policy', onboardingCompleted: true },
  { username: 'user_alpha', email: 'alpha@example.com', password: 'password123', role: 'user', onboardingCompleted: true },
  { username: 'user_beta', email: 'beta@example.com', password: 'password123', role: 'user', onboardingCompleted: true },
  { username: 'user_gamma', email: 'gamma@example.com', password: 'password123', role: 'user', onboardingCompleted: true },
  { username: 'tech_fan', email: 'tech@example.com', password: 'password123', role: 'user', onboardingCompleted: true },
  { local_guy: 'local_guy', username: 'local_guy', email: 'local@example.com', password: 'password123', role: 'user', onboardingCompleted: true },
  { username: 'sports_nut', email: 'sports@example.com', password: 'password123', role: 'user', onboardingCompleted: true },
  { username: 'movie_buff', email: 'movie@example.com', password: 'password123', role: 'user', onboardingCompleted: true },
];

const communitiesData = [
  { name: 'TechTalk', description: 'All things technology, AI, and startups.', category: 'Technology', isLocal: false },
  { name: 'PoliticalDebate', description: 'Discussing global and local politics.', category: 'Politics', isLocal: false },
  { name: 'SportsHub', description: 'Your daily sports updates and discussions.', category: 'Sports', isLocal: false },
  { name: 'LocalNY', description: 'New York local news and events.', category: 'Local Issues', isLocal: true, location: { type: 'Point', coordinates: [-74.0060, 40.7128] } },
  { name: 'HealthyLiving', description: 'Fitness, diets, and mental health.', category: 'Health', isLocal: false },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB. Seeding...');

    // Clear existing dummy data if necessary (optional, but let's just add new ones for now, checking if exists)
    // Wait, let's just create them.

    const createdUsers = [];
    for (let u of usersData) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = new User(u);
        await user.save();
      }
      createdUsers.push(user);
    }
    console.log('Users seeded');

    const createdCommunities = [];
    for (let c of communitiesData) {
      let comm = await Community.findOne({ name: c.name });
      if (!comm) {
        comm = new Community({
          ...c,
          creator: createdUsers[0]._id, // First user is creator
          members: createdUsers.slice(0, 5).map(u => u._id) // Add first 5 users as members
        });
        await comm.save();
      }
      createdCommunities.push(comm);
    }
    console.log('Communities seeded');

    // Create a dummy post for each community
    for (let comm of createdCommunities) {
      const existingPost = await Post.findOne({ community: comm._id });
      if (!existingPost) {
        const post = new Post({
          author: createdUsers[0]._id,
          community: comm._id,
          title: `Welcome to ${comm.name}!`,
          content: `This is the first discussion thread for ${comm.name}. Feel free to introduce yourselves!`,
          upvotes: [createdUsers[1]._id, createdUsers[2]._id]
        });
        await post.save();

        // Create comments
        const c1 = new Comment({
          post: post._id,
          author: createdUsers[1]._id,
          content: 'Thanks! Happy to be here.',
          upvotes: [createdUsers[0]._id]
        });
        await c1.save();
        
        post.comments.push(c1._id);
        await post.save();
      }
    }
    console.log('Posts and Comments seeded');

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();
