/**
 * seedLocalAndCommunity.js - Dummy data for Nearby Buzz + Community + Following tabs
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User      = require('../models/User');
const Post      = require('../models/Post');
const Community = require('../models/Community');

const IMG = {
  protest:   'https://images.unsplash.com/photo-1569683795645-b62e50fbf103?w=800&q=80',
  traffic:   'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=80',
  flood:     'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&q=80',
  fire:      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  community: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
  market:    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80',
  road:      'https://images.unsplash.com/photo-1581093458791-9d42e4a018ca?w=800&q=80',
  rally:     'https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=800&q=80',
  event:     'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80',
};

const LOCAL_POSTS = [
  { content: 'Large protest gathering near the city center. Roads blocked on MG Road. Police deployed. Please avoid the area.', category: 'Alert', imageUrl: IMG.protest, location: { type: 'Point', coordinates: [77.5946, 12.9716] }, isAnonymous: false },
  { content: 'Major flooding on NH-48 near Tumkur Road. At least 3 feet of water. Emergency services dispatched.', category: 'Alert', imageUrl: IMG.flood, location: { type: 'Point', coordinates: [77.5500, 13.0100] }, isAnonymous: false },
  { content: 'Traffic crawling on Outer Ring Road — multi-vehicle collision. Expect 1-2 hour delays. Police on scene.', category: 'Alert', imageUrl: IMG.traffic, location: { type: 'Point', coordinates: [77.6200, 12.9300] }, isAnonymous: false },
  { content: 'Fire reported at warehouse on Industrial Area Phase 2. Fire brigade on site. Keep windows closed.', category: 'Alert', imageUrl: IMG.fire, location: { type: 'Point', coordinates: [77.5890, 12.9820] }, isAnonymous: false },
  { content: 'Farmers market this Saturday at Indiranagar! Fresh produce, art and live music. 8am-2pm. Free entry.', category: 'Event', imageUrl: IMG.market, location: { type: 'Point', coordinates: [77.6408, 12.9784] }, isAnonymous: false },
  { content: 'Road closed near Marathahalli bridge — emergency pipeline repair. Reopen by 6pm. Use ITPL alternate.', category: 'Alert', imageUrl: IMG.road, location: { type: 'Point', coordinates: [77.7000, 12.9600] }, isAnonymous: false },
  { content: 'Public rally at Town Hall demanding pothole repairs. Hundreds of residents. Peaceful march.', category: 'Discussion', imageUrl: IMG.rally, location: { type: 'Point', coordinates: [77.5800, 12.9750] }, isAnonymous: false },
  { content: 'Neighborhood clean-up drive Sunday 7am at Koramangala water tank junction. Bring gloves!', category: 'Event', imageUrl: IMG.community, location: { type: 'Point', coordinates: [77.6245, 12.9355] }, isAnonymous: false },
  { content: 'Water supply cut in BTM Layout 2nd Stage for 24 hours from 10pm tonight. BWSSB maintenance.', category: 'Alert', imageUrl: null, location: { type: 'Point', coordinates: [77.6100, 12.9157] }, isAnonymous: true },
  { content: 'Tech fair at Cubbon Park this weekend! 50+ startups exhibiting. Entry free. Saturday 10am-6pm.', category: 'Event', imageUrl: IMG.event, location: { type: 'Point', coordinates: [77.5937, 12.9763] }, isAnonymous: false }
];

const COMMUNITY_POSTS = [
  { content: 'Breaking: Massive anti-government protest in Delhi. Tens of thousands at India Gate. Police deployed.', imageUrl: IMG.protest, category: 'General' },
  { content: 'Infrastructure crisis: Flooding across major Indian cities after record monsoon. Government response under scrutiny.', imageUrl: IMG.flood, category: 'General' },
  { content: 'Tech meetup community event photos! Great discussions on AI, climate, and citizen journalism ethics.', imageUrl: IMG.event, category: 'General' },
  { content: 'Road rage incident caught on camera near Whitefield IT hub. What should authorities do?', imageUrl: IMG.traffic, category: 'General' },
  { content: 'Inside the farmers market revival — communities fighting back against corporate food chains.', imageUrl: IMG.market, category: 'General' }
];

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('Connected!');

    const users = await User.find({}).limit(15);
    if (users.length < 2) { console.log('Not enough users in DB.'); process.exit(1); }
    console.log('Users:', users.map(u => u.username).join(', '));

    // Create follow relationships so Following tab has posts
    for (let i = 0; i < Math.min(users.length, 8); i++) {
      const follower = users[i];
      const targets = users.filter((_, idx) => idx !== i).slice(0, 3);
      for (const target of targets) {
        const fid = follower._id.toString();
        const tid = target._id.toString();
        if (!follower.following.map(x => x.toString()).includes(tid)) {
          follower.following.push(target._id);
        }
        if (!target.followers.map(x => x.toString()).includes(fid)) {
          target.followers.push(follower._id);
          await target.save();
        }
      }
      await follower.save();
    }
    console.log('Follow relationships done.');

    // Seed local posts
    for (let i = 0; i < LOCAL_POSTS.length; i++) {
      const author = users[i % users.length];
      await Post.create({
        ...LOCAL_POSTS[i],
        author: author._id,
        likes: users.slice(0, Math.floor(Math.random() * 5)).map(u => u._id),
        createdAt: new Date(Date.now() - (i * 3600000))
      });
    }
    console.log('Local posts seeded.');

    // Seed community posts
    const communities = await Community.find({}).limit(5);
    for (let i = 0; i < COMMUNITY_POSTS.length; i++) {
      const author = users[(i + 2) % users.length];
      const community = communities.length > 0 ? communities[i % communities.length] : null;
      await Post.create({
        ...COMMUNITY_POSTS[i],
        author: author._id,
        community: community ? community._id : null,
        likes: users.slice(0, Math.floor(Math.random() * 7) + 2).map(u => u._id),
        createdAt: new Date(Date.now() - (i * 7200000))
      });
    }
    console.log('Community posts seeded.');

    console.log('\n=== ALL DONE! ===');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
seed();
