const axios = require('axios');

// Validate API Key
// Get API key from environment variables
const API_KEY = process.env.NEWSAPI_API_KEY;
if (!API_KEY) {
  console.error('❌ NewsAPI key is not configured. Please set NEWSAPI_API_KEY in your .env file');
  throw new Error('NewsAPI key is not configured');
}

const BASE_URL = 'https://newsapi.org/v2';
console.log(`NewsAPI Base URL: ${BASE_URL}`);

// Configure axios instance with interceptors
const newsApi = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'X-Api-Key': API_KEY,
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for better error handling
newsApi.interceptors.request.use(
  config => {
    console.log(`🌐 Making ${config.method.toUpperCase()} request to ${config.url}`);
    // Ensure API key is included in the request
    if (!config.params) {
      config.params = {};
    }
    config.params.apiKey = API_KEY;
    return config;
  },
  error => {
    console.error('❌ Request error:', error.message);
    return Promise.reject(error);
  }
);

// Add response interceptor for consistent error handling
newsApi.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, statusText, data } = error.response;
      console.error(`❌ API Error ${status} (${statusText}):`, data?.message || 'No error message');
      console.error('Response data:', JSON.stringify(data, null, 2));
      
      if (status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (status === 401) {
        throw new Error(`Invalid API key. Please check your NewsAPI key. Current key: ${API_KEY ? 'Set (but invalid)' : 'Not set'}`);
      } else if (status === 426) {
        throw new Error('Your plan does not support HTTPS. Please upgrade your plan at https://newsapi.org/pricing');
      } else if (status >= 500) {
        throw new Error(`NewsAPI server error (${status}): ${statusText}`);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response from server:', error.request);
      throw new Error('Could not connect to the news service. Please check your internet connection.');
    } else {
      // Something happened in setting up the request
      console.error('Request setup error:', error.message);
      throw new Error('Error setting up the request to news service.');
    }
    return Promise.reject(error);
  }
);

const fetchTopHeadlines = async (params = {}) => {
  try {
    // Set default parameters
    const defaultParams = {
      country: 'us',
      pageSize: 10,
      page: 1,
      ...params
    };
    
    console.log('📰 Fetching top headlines with params:', JSON.stringify(defaultParams, null, 2));
    
    const response = await newsApi.get('/top-headlines', { 
      params: defaultParams
    });
    
    console.log(`✅ Successfully fetched ${response.data.articles?.length || 0} articles`);
    return response.data;
  } catch (error) {
    console.error('❌ Error in getTopHeadlines:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw new Error(`Failed to fetch top headlines: ${error.message}`);
  }
};

const searchNews = async (query, params = {}) => {
  try {
    const { data } = await newsApi.get('/everything', { 
      params: {
        q: query,
        pageSize: 20,
        sortBy: 'publishedAt',
        language: 'en',
        ...params
      } 
    });
    return data.articles || [];
  } catch (error) {
    console.error('Error searching news:', error.message);
    throw new Error('Failed to search news');
  }
};

module.exports = {
  fetchTopHeadlines,
  searchNews
};
