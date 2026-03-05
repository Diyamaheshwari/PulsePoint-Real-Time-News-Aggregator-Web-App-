// In d:\pulsepoint1\pulsepoint\client\src\services\newsService.js
import axios from 'axios';

// API Configuration - Using environment variables for API keys
// GNews API configuration
const GNEWS_API_KEY = process.env.REACT_APP_GNEWS_API_KEY || '';
const useGNews = !!GNEWS_API_KEY;
const GNEWS_API_URL = 'https://gnews.io/api/v4';
const NEWSAPI_API_KEY = process.env.REACT_APP_NEWSAPI_API_KEY;
const NEWSAPI_BASE_URL = process.env.REACT_APP_NEWSAPI_BASE_URL || 'https://newsapi.org/v2';

// Fallback news sources if both APIs fail
const FALLBACK_SOURCES = [
  'BBC News',
  'CNN',
  'The New York Times',
  'The Guardian',
  'Reuters'
];

// Log API configuration (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('News Service Configuration:', {
    gnewsConfigured: !!GNEWS_API_KEY,
    newsapiConfigured: !!NEWSAPI_API_KEY,
    gnewsApiUrl: GNEWS_API_URL,
    newsapiUrl: NEWSAPI_BASE_URL
  });
}

if (!GNEWS_API_KEY) {
  console.warn('GNews API Key is not configured. Will use NewsAPI as primary source.');
}

// Cache configuration
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes cache (increased from 5)
const requestCache = new Map();
let lastApiCallTime = 0;
const MIN_API_INTERVAL = 2000; // 2 seconds between API calls (increased from 1s)
const RATE_LIMIT_DELAY = 5000; // 5 seconds delay when rate limited (increased from 2s)
const MAX_RETRIES = 2; // Maximum number of retry attempts for failed requests

// Track rate limits
const rateLimitInfo = {
  remaining: 100, // Default value, will be updated from headers
  reset: 0 // Timestamp when rate limit resets
};

const generateCacheKey = (endpoint, params) => {
  const paramsString = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('&');
  return `${endpoint}?${paramsString}`;
};

const isCacheValid = (timestamp) => {
  return Date.now() - timestamp < CACHE_DURATION;
};

// Generate fallback news data
const getFallbackNews = async (category = 'general', count = 10) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Using fallback news data for category:', category);
  }
  const categories = {
    general: [
      { 
        title: 'Breaking News: Important Update', 
        description: 'This is a sample news article. The GNews API might be unavailable or the API key might have reached its limit.', 
        url: '#', 
        image: 'https://via.placeholder.com/400x200?text=News+1', 
        publishedAt: new Date().toISOString(), 
        source: { name: 'News Service' },
        content: 'This is a sample news article content. The real content is not available right now.'
      },
      { 
        title: 'Latest Developments', 
        description: 'Here are the latest updates on current events.', 
        url: '#', 
        image: 'https://via.placeholder.com/400x200?text=News+2', 
        publishedAt: new Date().toISOString(), 
        source: { name: 'News Service' },
        content: 'This is another sample news article content.'
      },
    ],
    technology: [
      { 
        title: 'Tech Update: New Innovations', 
        description: 'Discover the latest in technology and innovation.', 
        url: '#', 
        image: 'https://via.placeholder.com/400x200?text=Tech+1', 
        publishedAt: new Date().toISOString(), 
        source: { name: 'Tech News' },
        content: 'Latest technology news and updates.'
      },
      { 
        title: 'Gadget Review', 
        description: 'In-depth review of the latest gadgets in the market.', 
        url: '#', 
        image: 'https://via.placeholder.com/400x200?text=Tech+2', 
        publishedAt: new Date().toISOString(), 
        source: { name: 'Tech News' },
        content: 'Detailed gadget reviews and comparisons.'
      },
    ],
    business: [
      { 
        title: 'Market Update', 
        description: 'Latest trends and updates from the business world.', 
        url: '#', 
        image: 'https://via.placeholder.com/400x200?text=Business+1', 
        publishedAt: new Date().toISOString(), 
        source: { name: 'Business Daily' },
        content: 'Market trends and financial updates.'
      },
      { 
        title: 'Financial News', 
        description: 'Stay updated with the latest in finance and investments.', 
        url: '#', 
        image: 'https://via.placeholder.com/400x200?text=Business+2', 
        publishedAt: new Date().toISOString(), 
        source: { name: 'Business Daily' },
        content: 'Financial market news and investment advice.'
      },
    ],
    sports: [
      { 
        title: 'Sports Highlights', 
        description: 'Catch up with the latest in sports from around the world.', 
        url: '#', 
        image: 'https://via.placeholder.com/400x200?text=Sports+1', 
        publishedAt: new Date().toISOString(), 
        source: { name: 'Sports Network' },
        content: 'Sports news and match highlights.'
      },
      { 
        title: 'Match Results', 
        description: 'Scores and updates from recent matches and tournaments.', 
        url: '#', 
        image: 'https://via.placeholder.com/400x200?text=Sports+2', 
        publishedAt: new Date().toISOString(), 
        source: { name: 'Sports Network' },
        content: 'Sports match results and analysis.'
      },
    ],
    health: [
      { 
        title: 'Health & Wellness', 
        description: 'Tips and updates on health and wellness.', 
        url: '#', 
        image: 'https://via.placeholder.com/400x200?text=Health+1', 
        publishedAt: new Date().toISOString(), 
        source: { name: 'Health News' },
        content: 'Health tips and wellness advice.'
      },
      { 
        title: 'Medical Breakthroughs', 
        description: 'Latest developments in medical research and treatments.', 
        url: '#', 
        image: 'https://via.placeholder.com/400x200?text=Health+2', 
        publishedAt: new Date().toISOString(), 
        source: { name: 'Health News' },
        content: 'Medical research and healthcare updates.'
      },
    ],
    entertainment: [
      { 
        title: 'Entertainment News', 
        description: 'The latest in movies, music, and celebrity news.', 
        url: '#', 
        image: 'https://via.placeholder.com/400x200?text=Entertainment+1', 
        publishedAt: new Date().toISOString(), 
        source: { name: 'Entertainment Tonight' },
        content: 'Entertainment industry news and updates.'
      },
      { 
        title: 'Movie Reviews', 
        description: 'Honest reviews of the latest movie releases.', 
        url: '#', 
        image: 'https://via.placeholder.com/400x200?text=Entertainment+2', 
        publishedAt: new Date().toISOString(), 
        source: { name: 'Entertainment Tonight' },
        content: 'Movie reviews and recommendations.'
      },
    ],
    science: [
      { 
        title: 'Scientific Discoveries', 
        description: 'Breaking news from the world of science and research.', 
        url: '#', 
        image: 'https://via.placeholder.com/400x200?text=Science+1', 
        publishedAt: new Date().toISOString(), 
        source: { name: 'Science Journal' },
        content: 'Latest scientific research and discoveries.'
      },
      { 
        title: 'Space Exploration', 
        description: 'Latest updates on space missions and discoveries.', 
        url: '#', 
        image: 'https://via.placeholder.com/400x200?text=Science+2', 
        publishedAt: new Date().toISOString(), 
        source: { name: 'Science Journal' },
        content: 'Space exploration news and updates.'
      },
    ]
  };

  // Return the appropriate category or default to general
  const newsItems = categories[category] || categories.general;
  
  // Duplicate items if needed to match the requested count
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push({
      ...newsItems[i % newsItems.length],
      id: `fallback-${category}-${i}`,
      title: newsItems[i % newsItems.length].title + (i > 1 ? ` (${Math.floor(i/newsItems.length) + 1})` : '')
    });
  }
  
  return result;
};

const fetchGNews = async (category = 'general', country = 'us', max = 10) => {
  if (!GNEWS_API_KEY) {
    console.log('GNews API key not configured, using fallback data');
    return getFallbackNews(category, max);
  }
  const cacheKey = `gnews-${category}-${country}-${max}`;
  const cached = requestCache.get(cacheKey);
  
  if (cached && isCacheValid(cached.timestamp)) {
    console.log('Returning cached GNews data');
    return cached.data;
  }

  try {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTime;
    
    if (timeSinceLastCall < MIN_API_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_API_INTERVAL - timeSinceLastCall));
    }

    lastApiCallTime = Date.now();

    const params = {
      token: GNEWS_API_KEY,
      lang: 'en',
      country: country.toLowerCase(),
      max: Math.min(max, 100), // GNews has a max of 100 articles per request
      category: category
    };

    console.log('Fetching GNews with params:', { ...params, apikey: '***' });
    
    const response = await axios.get(`${GNEWS_API_URL}/top-headlines`, {
      params,
      timeout: 10000, // 10 second timeout
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const data = response.data.articles || [];
    requestCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error('GNews API Error:', error.response?.status, error.message);
    
    // Handle specific error cases
    if (error.response?.status === 403) {
      console.warn('GNews API key may be invalid or rate limited. Using fallback data.');
      // Return fallback data instead of throwing to prevent UI errors
      return getFallbackNews(category, max);
    }
    
    // If we have cached data, return it even if it's stale
    if (cached) {
      console.log('Using stale GNews cache due to error');
      return cached.data;
    }
    
    // For other errors, return fallback data
    return getFallbackNews(category, max);
  }
};

// Enhanced fetch with retry logic and better error handling
const fetchWithRetry = async (url, options = {}, retries = MAX_RETRIES, delay = 1000) => {
  try {
    // Skip if we're rate limited
    if (rateLimitInfo.remaining <= 0 && rateLimitInfo.reset > Date.now()) {
      const waitTime = rateLimitInfo.reset - Date.now() + 1000; // Add 1s buffer
      console.warn(`Rate limited. Waiting ${waitTime}ms before next request...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    const response = await axios({
      url,
      ...options,
      timeout: options.timeout || 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    
    // Update rate limit info if headers are available
    if (response.headers) {
      const remaining = response.headers['x-ratelimit-remaining'] || 
                       response.headers['x-ratelimit-remaining-requests'];
      const reset = response.headers['x-ratelimit-reset'] || 
                   response.headers['x-ratelimit-requests-reset'];
      
      if (remaining) rateLimitInfo.remaining = parseInt(remaining, 10);
      if (reset) {
        // Handle both timestamp and seconds formats
        rateLimitInfo.reset = reset.length > 10 ? 
          parseInt(reset, 10) : // Already a timestamp
          Date.now() + (parseInt(reset, 10) * 1000); // Convert seconds to future timestamp
      }
    }
    
    return response.data;
  } catch (error) {
    // If we've run out of retries or this is a client error (4xx) that won't benefit from retrying
    if (retries <= 0 || (error.response && error.response.status >= 400 && error.response.status < 500)) {
      // For 403 Forbidden, we might want to handle it differently
      if (error.response?.status === 403) {
        console.error('Access forbidden - check API key and permissions');
        // Return null to trigger fallback
        return null;
      }
      
      // For other errors, rethrow to be handled by the caller
      throw error;
    }
    
    // If rate limited, use the reset time for delay
    if (error.response?.status === 429) {
      const resetTime = error.response.headers['retry-after'] || 
                       error.response.headers['x-ratelimit-reset'] || 
                       RATE_LIMIT_DELAY;
      
      console.warn(`Rate limited. Retrying in ${resetTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, 
        typeof resetTime === 'string' ? parseInt(resetTime, 10) * 1000 : resetTime
      ));
    } else {
      // Exponential backoff with jitter
      const jitter = Math.random() * 1000; // Add up to 1s of jitter
      const backoff = Math.min(delay * 2, 30000); // Cap at 30s
      console.warn(`Request failed, retrying in ${backoff}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, backoff + jitter));
    }
    
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  }
};

// Export all necessary functions
export { getFallbackNews, fetchGNews, fetchWithRetry };

// Periodically clean up expired cache entries
setInterval(() => {
  const now = Date.now();
  let expiredCount = 0;
  
  requestCache.forEach((value, key) => {
    if (!isCacheValid(value.timestamp)) {
      requestCache.delete(key);
      expiredCount++;
    }
  });
  
  if (expiredCount > 0) {
    console.log(`Cleaned up ${expiredCount} expired cache entries`);
  }
}, CACHE_DURATION);