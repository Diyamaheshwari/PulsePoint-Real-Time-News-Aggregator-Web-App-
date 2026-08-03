import axios from 'axios';
import { toast } from 'react-toastify';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000'),
  withCredentials: true, // Important for sending cookies
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000, // 15 seconds timeout
});

// Function to get token from localStorage
const getToken = () => {
  return localStorage.getItem('token');
};

// Store the current retry count for each request
const MAX_RETRIES = 3;
const retryCount = {};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add timestamp to track request time
    config.metadata = { startTime: new Date() };
    
    // Get token from localStorage for auth
    const token = getToken();
    
    // Skip token check for thoughts and polls endpoints to allow anonymous posting
    const isPublicEndpoint = config.url && (
      config.url.includes('/thoughts') || 
      config.url.includes('/polls')
    );
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (!isPublicEndpoint) {
      // Only reject if it's not a public endpoint
      return Promise.reject('No authentication token found');
    }
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`%c${config.method?.toUpperCase()} ${config.url}`, 
        'color: #4CAF50; font-weight: bold', 
        {
          withCredentials: config.withCredentials,
          hasToken: !!token,
          headers: config.headers
        }
      );
    }
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with retry logic
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';
    
    // Initialize retry count for this URL if it doesn't exist
    if (!retryCount[url]) {
      retryCount[url] = 0;
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        url: originalRequest?.url,
        method: originalRequest?.method,
        status: error.response?.status,
        data: error.response?.data,
        retryCount: retryCount[url],
      });
    }

    // Handle rate limiting (429)
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 1;
      
      if (retryCount[url] < MAX_RETRIES) {
        retryCount[url]++;
        
        // Wait for the specified retry-after time (in seconds)
        await new Promise(resolve => 
          setTimeout(resolve, retryAfter * 1000)
        );
        
        // Retry the request
        return api(originalRequest);
      } else {
        toast.error('Too many requests. Please try again later.');
        return Promise.reject('Rate limit exceeded');
      }
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Clear auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = `/login?returnUrl=${encodeURIComponent(window.location.pathname)}`;
      }
      
      return Promise.reject('Session expired. Please log in again.');
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action');
      return Promise.reject('Forbidden');
    }

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      return Promise.reject('Resource not found');
    }

    // Handle 5xx Server Errors
    if (error.response?.status >= 500) {
      // Retry on 5xx errors
      if (retryCount[url] < MAX_RETRIES) {
        retryCount[url]++;
        
        // Exponential backoff: 1s, 2s, 4s, etc.
        const delay = Math.pow(2, retryCount[url]) * 1000;
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return api(originalRequest);
      }
      
      toast.error('A server error occurred. Please try again later.');
      return Promise.reject('Server error');
    }

    // Handle network errors
    if (!error.response) {
      // Retry on network errors
      if (retryCount[url] < MAX_RETRIES) {
        retryCount[url]++;
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        return api(originalRequest);
      }
      
      toast.error('Network error. Please check your connection and try again.');
      return Promise.reject('Network error');
    }

    // For other errors, pass through the error message from the server if available
    const errorMessage = error.response?.data?.message || 'An error occurred';
    return Promise.reject(errorMessage);
  }
);

export default api;
