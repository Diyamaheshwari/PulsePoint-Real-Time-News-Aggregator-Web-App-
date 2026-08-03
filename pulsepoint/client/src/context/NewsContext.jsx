import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// Create a custom axios instance with request cancellation support
const newsApi = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/news`,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

const NewsContext = createContext();

const API_KEY = import.meta.env.VITE_NEWSAPI_API_KEY;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const DEBOUNCE_DELAY = 500; // 500ms debounce delay

// Log API configuration
console.log('NewsContext API Configuration:', {
  usingEnv: !!API_KEY,
  apiKeyConfigured: !!API_KEY
});

if (!API_KEY) {
  console.error('NewsAPI Key is not configured in NewsContext. Please set VITE_NEWSAPI_API_KEY in your .env file');
}

// Simple in-memory cache
const cache = {
  data: null,
  timestamp: 0,
  key: '',
  request: null
};

export const NewsProvider = ({ children }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    country: 'us',
    category: 'general',
    pageSize: 10,
    page: 1,
    q: '',
    sortBy: 'publishedAt'
  });

  const debounceTimeoutRef = useRef(null);
  const lastRequestRef = useRef(null);

  const fetchNews = useCallback(async (params = {}, retryCount = 0, isDebounced = false) => {
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1000;

    // Clear any pending debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    // Cancel previous request if it's still pending
    if (cache.request) {
      cache.request.cancel('Request superseded by new request');
    }

    // Create a new CancelToken for this request
    const source = axios.CancelToken.source();
    cache.request = source;
    lastRequestRef.current = { params };

    // If this is a debounced request, delay the actual API call
    if (isDebounced) {
      return new Promise((resolve) => {
        debounceTimeoutRef.current = setTimeout(async () => {
          try {
            const result = await fetchNews(params, retryCount, false);
            resolve(result);
          } catch (err) {
            resolve(null);
          }
        }, DEBOUNCE_DELAY);
      });
    }

    const cacheKey = JSON.stringify(params);

    // Check cache first
    if (cache.key === cacheKey && Date.now() - cache.timestamp < CACHE_DURATION) {
      setNews(cache.data);
      setLoading(false);
      return;
    }

    if (retryCount === 0) {
      setLoading(true);
      setError(null);
    }

    try {
     const response = await newsApi.get('/feed', {
  params: {
    category: filters.category !== 'general' ? filters.category : undefined,
    page: filters.page,
    limit: filters.pageSize,
    search: filters.q || undefined,
    sortBy: filters.sortBy === 'publishedAt' ? 'recent' : filters.sortBy,
  }
});

      if (response.data && Array.isArray(response.data.articles)) {
        const articles = response.data.articles.map(article => ({
          ...article,
          id: article.url || `article-${Math.random().toString(36).substr(2, 9)}`,
          title: article.title || 'No title available',
          description: article.description || 'No description available',
          url: article.url || '#',
          urlToImage: article.urlToImage || 'https://via.placeholder.com/400x200?text=No+Image',
          publishedAt: article.publishedAt || new Date().toISOString(),
          source: {
            name: article.source?.name || 'Unknown Source'
          }
        }));

        // Update cache
        cache.data = articles;
        cache.timestamp = Date.now();
        cache.key = cacheKey;

        setNews(articles);
        setError(null);
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log('Request canceled:', err.message);
        return;
      }

      console.error('Error fetching news:', err);

      if (retryCount < MAX_RETRIES) {
        console.log(`Retry attempt ${retryCount + 1}/${MAX_RETRIES}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return fetchNews(params, retryCount + 1);
      }

      setError('Failed to load news. Please try again later.');
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update filters and fetch news
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => {
      const updatedFilters = {
        ...prev,
        ...newFilters,
        // Reset to first page when filters change
        ...(newFilters.category && { page: 1 })
      };
      
      // Debounce the API call when filters change
      fetchNews(updatedFilters, 0, true);
      
      return updatedFilters;
    });
  }, [fetchNews]);

  // Initial data fetch
  useEffect(() => {
    fetchNews(filters);

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      if (cache.request) {
        cache.request.cancel('Component unmounted');
      }
      
      cache.request = null;
    };
  }, [fetchNews]);

  // Manual refresh
  const refreshNews = useCallback(async () => {
    // Invalidate cache
    cache.timestamp = 0;
    cache.key = '';
    cache.data = null;
    
    return fetchNews(filters);
  }, [fetchNews, filters]);

  return (
    <NewsContext.Provider
      value={{
        news,
        loading,
        error,
        filters,
        fetchNews,
        updateFilters,
        refreshNews
      }}
    >
      {children}
    </NewsContext.Provider>
  );
};

export const useNews = () => {
  const context = useContext(NewsContext);
  if (!context) {
    throw new Error('useNews must be used within a NewsProvider');
  }
  return context;
};

export default NewsContext;