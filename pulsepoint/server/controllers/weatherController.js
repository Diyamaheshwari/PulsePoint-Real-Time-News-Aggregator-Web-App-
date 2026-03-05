const axios = require('axios');
const { OPENWEATHER_API_KEY, OPENWEATHER_BASE_URL } = process.env;

// Map of country codes to their capital cities
const capitalCities = {
  us: 'Washington, D.C.',
  in: 'New Delhi',
  gb: 'London',
  ca: 'Ottawa',
  au: 'Canberra',
  de: 'Berlin',
  fr: 'Paris',
  jp: 'Tokyo',
  cn: 'Beijing',
  ru: 'Moscow',
  br: 'Brasília',
  za: 'Pretoria',
  eg: 'Cairo',
  mx: 'Mexico City',
  it: 'Rome',
  es: 'Madrid',
  nl: 'Amsterdam',
  se: 'Stockholm',
  ch: 'Bern',
  no: 'Oslo',
  dk: 'Copenhagen',
  fi: 'Helsinki',
  pl: 'Warsaw',
  tr: 'Ankara',
  sa: 'Riyadh',
  ae: 'Abu Dhabi',
  kr: 'Seoul',
  sg: 'Singapore'
};

const getWeather = async (req, res) => {
  try {
    let { city, country = 'us' } = req.query;
    
    // If no city is provided but country is, use the capital city for that country
    if (!city && country && capitalCities[country]) {
      city = capitalCities[country];
      console.log(`Using capital city for ${country}: ${city}`);
    } else if (!city) {
      city = 'London'; // Fallback default
    }

    console.log('Fetching weather for:', { city, country });

    // Try to get weather by city and country first
    let response;
    try {
      response = await axios.get(OPENWEATHER_BASE_URL, {
        params: {
          q: `${city},${country}`,
          appid: OPENWEATHER_API_KEY,
          units: 'metric',
          lang: 'en',
          cnt: 1
        },
        timeout: 10000 // 10 second timeout
      });
    } catch (err) {
      // If city,country fails, try with just the city
      if (err.response?.status === 404) {
        console.log('City,Country not found, trying with city only');
        response = await axios.get(OPENWEATHER_BASE_URL, {
          params: {
            q: city,
            appid: OPENWEATHER_API_KEY,
            units: 'metric',
            lang: 'en',
            cnt: 1
          },
          timeout: 10000
        });
      } else {
        throw err;
      }
    }

    // Extract and format the weather data
    const weatherData = {
      temperature: Math.round(response.data.main.temp),
      feels_like: Math.round(response.data.main.feels_like),
      humidity: response.data.main.humidity,
      description: response.data.weather[0].description,
      icon: response.data.weather[0].icon,
      wind_speed: Math.round(response.data.wind.speed * 3.6), // Convert m/s to km/h
      city: response.data.name,
      country: response.data.sys.country,
      timestamp: new Date().toISOString()
    };
    
    console.log('Weather data fetched successfully:', { 
      city: weatherData.city, 
      country: weatherData.country,
      temp: weatherData.temperature 
    });

    console.log('Successfully fetched weather for', city, ':', response.data.weather[0].description);

    res.json(weatherData);
  } catch (error) {
    console.error('Weather API Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        params: error.config?.params
      }
    });
    
    if (error.response) {
      // Handle specific error cases
      if (error.response.status === 401) {
        return res.status(500).json({ 
          error: 'Weather service configuration error',
          details: 'Invalid API key or service configuration'
        });
      } else if (error.response.status === 404) {
        return res.status(404).json({ 
          error: 'Location not found',
          details: `Could not find weather data for ${city}${country ? `, ${country}` : ''}`
        });
      } else if (error.response.status === 429) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          details: 'Too many requests to the weather service. Please try again later.'
        });
      }
      
      return res.status(error.response.status).json({ 
        error: error.response.data.message || `Error from weather service: ${error.response.statusText}`,
        details: process.env.NODE_ENV === 'development' ? error.response.data : undefined
      });
    } 
    
    if (error.request) {
      return res.status(504).json({ 
        error: 'Weather service is currently unavailable',
        details: 'The request was made but no response was received. Please check your internet connection.'
      });
    }
    
    // Default error response
    res.status(500).json({ 
      error: 'Failed to fetch weather data',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getWeather
};
