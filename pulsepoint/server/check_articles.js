const mongoose = require('mongoose');
const News = require('./models/News');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const countries = await News.distinct('country');
  console.log('DISTINCT COUNTRIES:', countries);
  
  for (const c of countries) {
    const count = await News.countDocuments({ country: c });
    console.log(`Country ${c}: ${count} articles`);
  }
  process.exit(0);
}
check();
