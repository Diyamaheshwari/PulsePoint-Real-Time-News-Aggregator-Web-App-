const express = require('express');
const router = express.Router();
const { getWeather } = require('../controllers/weatherController');

// GET /api/weather?city={cityName}
router.get('/', getWeather);

module.exports = router;
