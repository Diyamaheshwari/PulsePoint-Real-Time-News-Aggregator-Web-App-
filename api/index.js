const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../pulsepoint/server/.env') });

const app = require('../pulsepoint/server/server');

module.exports = app;
