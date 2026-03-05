// In server/controllers/newsController.js
const { info, error } = require('../utils/logger');
const NodeCache = require('node-cache');
const rateLimit = require('express-rate-limit');
const { fetchTopHeadlines, searchNews } = require('../services/newsService');
require('dotenv').config();

// Configure cache with a 5 minute TTL
const newsCache = new NodeCache({ stdTTL: 300, checkperiod: 600 });

// Rate limiting configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const RATE_LIMIT = {
  WINDOW_MS: isDevelopment ? 5 * 1000 : 60 * 1000, // 5 seconds in dev, 1 minute in prod
  MAX_REQUESTS: isDevelopment ? 1000 : 10, // 1000 in dev, 10 in prod
};

// Track request counts per IP
const requestCounts = new Map();

// Reset request count for each IP after the window
setInterval(() => {
  requestCounts.clear();
}, RATE_LIMIT.WINDOW_MS);

// Rate limiting middleware for news API
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Get top headlines
exports.getTopHeadlines = async (req, res) => {
  const { 
    category = 'all',
    country = 'us',
    pageSize = 10, 
    page = 1, 
    q = ''
  } = req.query;
  
  const ip = req.ip || req.connection.remoteAddress;
  
  // Rate limiting check
  const requestCount = (requestCounts.get(ip) || 0) + 1;
  requestCounts.set(ip, requestCount);
  
  if (requestCount > RATE_LIMIT.MAX_REQUESTS) {
    const retryAfter = Math.ceil(RATE_LIMIT.WINDOW_MS / 1000);
    res.set('Retry-After', retryAfter.toString());
    return res.status(429).json({
      status: 'error',
      code: 429,
      message: 'Too many requests, please try again later.',
      retryAfter: `${retryAfter} seconds`
    });
  }
  
  try {
    // Generate cache key
    const cacheKey = `news_${category}_${country}_${pageSize}_${page}_${q}`;
    
    // Try to get data from cache first
    const cachedData = newsCache.get(cacheKey);
    if (cachedData) {
      info(`Serving from cache: ${cacheKey}`);
      return res.json({
        ...cachedData,
        cached: true
      });
    }

    // Prepare API parameters
    const params = {
      pageSize: Math.min(parseInt(pageSize), 100), // Ensure pageSize is within limits
      page: parseInt(page),
      country: country.toLowerCase()
    };

    // Only add optional parameters if they have values
    if (category && category !== 'all') params.category = category;
    
    // Add date filters if provided
    if (req.query.from) params.from = req.query.from;
    if (req.query.to) params.to = req.query.to;
    
    info(`Fetching top headlines with params: ${JSON.stringify({ ...params, country: params.country })}`);
    
    // Use the newsService to fetch data
    const response = await fetchTopHeadlines(params);
    
    if (!response || response.status !== 'ok') {
      throw new Error(response?.message || 'Failed to fetch top headlines');
    }
    
    // Transform the response to match the expected format
    const transformedData = {
      status: 'ok',
      totalResults: response.totalResults || 0,
      articles: (response.articles || []).map(article => ({
        title: article.title || 'No title available',
        description: article.description || '',
        content: article.content || '',
        url: article.url || '#',
        image: article.urlToImage || 'https://via.placeholder.com/300x200?text=No+Image',
        publishedAt: article.publishedAt || new Date().toISOString(),
        source: {
          name: article.source?.name || 'Unknown',
          url: article.url || '#'
        }
      }))
    };

    // Cache the successful response
    const cacheTTL = 300; // 5 minutes
    newsCache.set(cacheKey, transformedData, cacheTTL);
    
    info(`Fetched ${transformedData.articles.length} articles for ${cacheKey}`);
    
    res.json({
      ...transformedData,
      cached: false,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + cacheTTL * 1000).toISOString()
    });
  } catch (err) {
    error('Error in getTopHeadlines:', err);
    const statusCode = err.response?.status || 500;
    let errorMessage = 'Failed to fetch top headlines';
    
    if (statusCode === 429) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
      const retryAfter = err.response?.headers?.['retry-after'] || 60;
      res.set('Retry-After', retryAfter.toString());
    } else if (err.response?.data?.errors) {
      errorMessage = err.response.data.errors.join('; ');
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    // Try to return cached data if available
    const currentCacheKey = `news_${category}_${country}_${pageSize}_${page}_${q}`;
    const cachedData = newsCache.get(currentCacheKey);
    
    if (cachedData) {
      return res.status(200).json({
        ...cachedData,
        message: 'Serving cached data due to API error',
        cached: true,
        error: errorMessage
      });
    }
      
    // If no cached data and rate limited, suggest waiting
    if (err.response && err.response.status === 429) {
      const retryAfter = err.response.headers['retry-after'] || 60;
      return res.status(429).json({
        success: false,
        error: 'API rate limit exceeded',
        message: `Too many requests. Please try again after ${retryAfter} seconds`,
        retryAfter: parseInt(retryAfter)
      });
    }
      
    return res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch top headlines',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        error: err.message,
        status: err.response?.status,
        code: err.code,
        response: err.response?.data
      } : undefined
    });
  }
};

// Search news by keyword
exports.searchNews = async (req, res) => {
  const { q: query, page = 1, pageSize = 10 } = req.query;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Search query is required',
      message: 'Please provide a search query parameter (q)'
    });
  }

  try {
    // Prepare API parameters
    const params = {
      q: query,
      pageSize: pageSize,
      page: page
    };

    info(`Searching news with params: ${JSON.stringify(params)}`);
    
    // Use the newsService to fetch data
    const response = await searchNews(params);
    
    if (!response || response.status !== 'ok') {
      throw new Error(response?.message || 'Failed to search news');
    }
    
    // Transform the response to match the expected format
    const transformedData = {
      status: 'ok',
      totalResults: response.totalResults || 0,
      articles: (response.articles || []).map(article => ({
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        image: article.urlToImage,
        publishedAt: article.publishedAt,
        source: {
          name: article.source?.name || 'Unknown',
          url: article.url
        }
      }))
    };

    // Cache the response
    const cacheKey = `search_${query}_${page}_${pageSize}`;
    newsCache.set(cacheKey, transformedData);
    
    info(`Fetched ${transformedData.articles.length} articles for ${cacheKey}`);
    
    // Send the response
    res.json(transformedData);
  } catch (err) {
    error('Search News Error:', err);
    const statusCode = err.response?.status || 500;
    let errorMessage = 'Failed to search news';
    
    if (statusCode === 429) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
      const retryAfter = err.response?.headers?.['retry-after'] || 60;
      res.set('Retry-After', retryAfter.toString());
    } else if (err.response?.data?.errors) {
      errorMessage = err.response.data.errors.join('; ');
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    // Try to return cached data if available
    const cacheKey = `search_${req.query.q}_${req.query.page || 1}_${req.query.pageSize || 10}`;
    const cachedResponse = newsCache.get(cacheKey);
    
    if (cachedResponse) {
      return res.status(200).json({
        ...cachedResponse,
        message: 'Serving cached data due to API error',
        cached: true,
        error: errorMessage
      });
    }
      
    return res.status(statusCode).json({
      success: false,
      error: 'Failed to search news',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        error: err.message,
        response: err.response?.data
      } : undefined
    });
  }
};

// Get top news categories
exports.getTopCategories = (req, res) => {
  try {
    // This is a simplified example - in a real app, you might want to track
    // popular categories based on user interactions or other metrics
    const categories = [
      'business', 'entertainment', 'general', 
      'health', 'science', 'sports', 'technology'
    ];
    
    res.json({
      status: 'ok',
      categories: categories.map(category => ({
        id: category,
        name: category.charAt(0).toUpperCase() + category.slice(1),
        count: 0 // This would be populated with actual counts in a real app
      }))
    });
  } catch (err) {
    console.error('Error in getTopCategories:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news categories',
      message: err.message
    });
  }
};

// Get most viewed news
exports.getMostViewed = async (req, res) => {
  try {
    // Fetch top headlines from NewsAPI
    const response = await axios.get(`${BASE_URL}/top-headlines`, {
      params: {
        apiKey: API_KEY,
        language: 'en',
        country: 'us',
        pageSize: 10, // Get top 10 most viewed
        page: 1
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PulsePoint/1.0'
      },
      timeout: 10000
    });

    // Transform the response to match our format
    const mostViewed = (response.data.articles || []).map(article => ({
      title: article.title,
      description: article.description,
      url: article.url,
      urlToImage: article.urlToImage,
      publishedAt: article.publishedAt || new Date().toISOString(),
      source: article.source?.name || 'Unknown Source',
      // In a real app, you would include view count from your database
      viewCount: Math.floor(Math.random() * 1000) // Placeholder for demo
    }));

    // Sort by view count (descending)
    mostViewed.sort((a, b) => b.viewCount - a.viewCount);

    res.json(mostViewed);
  } catch (err) {
    console.error('Error in getMostViewed:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch most viewed news',
      message: err.message
    });
  }
};