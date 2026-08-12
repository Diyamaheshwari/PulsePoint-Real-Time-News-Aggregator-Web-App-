const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../pulsepoint/server/.env') });

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb+srv://Diyab:Diya%40123@pulsepoint.z0jirjt.mongodb.net/pulsepoint?retryWrites=true&w=majority&appName=PulsePoint';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = '4f8d5e2a1b3c9f7e6d0a9b8c7d6e5f4a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
}

const app = require('../pulsepoint/server/server');

module.exports = app;
