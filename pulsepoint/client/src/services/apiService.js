import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const MAX_RETRIES = 2; // Reduced from 3 to 2 to be less aggressive
const INITIAL_RETRY_DELAY = 2000; // Increased initial delay to 2 seconds
const MAX_RETRY_DELAY = 10000; // 10 seconds max delay

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // This is important for sending cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function for delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Request queue to prevent duplicate requests
const requestQueue = new Map();

// Retry interceptor with better rate limit handling
const retryRequest = async (error) => {
  const config = error.config;
  const requestKey = `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;
  
  // If we don't have config or retry is disabled, reject
  if (!config || !config.retry) {
    return Promise.reject(error);
  }

  // Set retry count if not set
  config.retryCount = config.retryCount || 0;
  
  // Check if we've reached max retries
  if (config.retryCount >= config.retry) {
    // Clean up the request queue
    requestQueue.delete(requestKey);
    
    // If it's a rate limit error, show a user-friendly message
    if (error.response?.status === 429) {
      error.message = 'Too many requests. Please wait a moment and try again.';
    }
    
    return Promise.reject(error);
  }

  // Check if this exact request is already being retried
  if (requestQueue.has(requestKey)) {
    return requestQueue.get(requestKey);
  }

  // Increase retry count
  config.retryCount += 1;
  
  // Calculate delay with exponential backoff and jitter
  const exponentialDelay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(2, config.retryCount - 1),
    MAX_RETRY_DELAY
  );
  const jitter = Math.random() * 1000; // Add up to 1s of jitter
  const delay = Math.floor(exponentialDelay + jitter);
  
  console.warn(`Retry ${config.retryCount}/${config.retry} for ${config.url} in ${delay}ms`);
  
  // Create a promise for this retry attempt
  const retryPromise = new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const response = await api(config);
        requestQueue.delete(requestKey);
        resolve(response);
      } catch (err) {
        requestQueue.delete(requestKey);
        // If this is the last retry, reject with the error
        if (config.retryCount >= config.retry) {
          reject(err);
        } else {
          // Otherwise, let the interceptor handle the next retry
          const retryError = { ...err, config };
          retryRequest(retryError).then(resolve).catch(reject);
        }
      }
    }, delay);
  });
  
  // Add to request queue
  requestQueue.set(requestKey, retryPromise);
  
  return retryPromise;
};

// Request interceptor to add auth token and handle caching
api.interceptors.request.use(
  (config) => {
    // Skip cache for non-GET requests
    if (config.method !== 'get') {
      return addAuthHeader(config);
    }
    
    // Check if this is a retry
    if (config.retryCount > 0) {
      console.log(`Retry attempt ${config.retryCount} for ${config.url}`);
    }
    
    return addAuthHeader(config);
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Helper function to add auth header
const addAuthHeader = (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (!['/auth/login', '/auth/register'].some(path => config.url.includes(path))) {
    console.warn('No token available for request:', config.url);
  }
  return config;
};
// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    // Clear any pending requests for this URL
    const requestKey = `${response.config.method}:${response.config.url}:${
      JSON.stringify(response.config.params || {})}`;
    requestQueue.delete(requestKey);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If there's no config, reject immediately
    if (!originalRequest) {
      return Promise.reject(error);
    }
    
    // Handle rate limiting (429) with retry
    if (error.response?.status === 429) {
      // Add retry configuration if not present
      if (originalRequest.retry === undefined) {
        originalRequest.retry = MAX_RETRIES;
      }
      
      // Only retry if we haven't exceeded max retries
      if ((originalRequest.retryCount || 0) < originalRequest.retry) {
        return retryRequest(error);
      }
      
      // If we've exceeded retries, show a user-friendly message
      error.message = 'The server is receiving too many requests. Please try again in a few minutes.';
      return Promise.reject(error);
    }
    
    // Handle 401 errors (Unauthorized)
    if (error.response?.status === 401) {
      // Only handle specific protected routes
      const protectedRoutes = [
        '/api/auth/me',
        '/api/users/'
      ];
      
      const currentUrl = originalRequest.url || '';
      const isProtectedRoute = protectedRoutes.some(route => currentUrl.includes(route));
      const isPostRequest = originalRequest.method?.toLowerCase() === 'post' && 
                          currentUrl.includes('/community/posts');
      
      if (isProtectedRoute) {
        console.log('Protected route requires authentication - redirecting to login');
        localStorage.removeItem('token');
        window.location.href = '/login?sessionExpired=true';
        return Promise.reject(new Error('Authentication required'));
      }
      
      // For post requests to community/posts, just reject with the error
      if (isPostRequest) {
        console.warn('Authentication failed for post creation:', error.response?.data?.message || 'Unauthorized');
        return Promise.reject(error);
      }
      
      // For other 401 errors, just reject without redirecting
      console.warn('Authentication failed but not redirecting:', currentUrl);
      return Promise.reject(error);
    }
    
    // For 500 errors, log them but don't redirect
    if (error.response?.status === 500) {
      console.error('Server error:', error.response?.data || 'Internal server error');
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

export const newsApi = {
  getTopHeadlines: async (params = {}) => {
    try {
      const response = await api.get('/news/headlines', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching top headlines:', error);
      throw error;
    }
  },
  
  searchNews: async (query, params = {}) => {
    try {
      const response = await api.get('/news/search', { 
        params: { q: query, ...params } 
      });
      return response.data;
    } catch (error) {
      console.error('Error searching news:', error);
      throw error;
    }
  },
  
  getSources: async () => {
    try {
      const response = await api.get('/news/sources');
      return response.data;
    } catch (error) {
      console.error('Error fetching news sources:', error);
      throw error;
    }
  },
  
  getCategories: async () => {
    try {
      const response = await api.get('/news/categories');
      return response.data;
    } catch (error) {
      console.error('Error fetching news categories:', error);
      throw error;
    }
  }
};

export default api;
