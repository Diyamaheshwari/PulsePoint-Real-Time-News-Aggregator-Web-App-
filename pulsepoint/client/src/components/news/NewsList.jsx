import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Typography, 
  CircularProgress, 
  ToggleButton, 
  ToggleButtonGroup, 
  TextField,
  MenuItem,
  Button,
  Stack,
  Paper
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import NewsCard from './NewsCard';
import WeatherWidget from '../WeatherWidget';
import api from '../../utils/api';

const categories = [
  'general',
  'business',
  'entertainment',
  'health',
  'science',
  'sports',
  'technology'
];

const countries = [
  { code: 'us', name: 'United States' },
  { code: 'in', name: 'India' },
  { code: 'gb', name: 'United Kingdom' },
  { code: 'ca', name: 'Canada' },
  { code: 'au', name: 'Australia' },
  { code: 'de', name: 'Germany' },
  { code: 'fr', name: 'France' },
  { code: 'jp', name: 'Japan' },
];

const NewsList = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState({ message: null, retry: null });
  const [category, setCategory] = useState('general');
  const [country, setCountry] = useState('in');
  const [selectedDate, setSelectedDate] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchNews = async (loadMore = false) => {
    try {
      const currentPage = loadMore ? page + 1 : 1;
      if (!loadMore) {
        setLoading(true);
        setArticles([]);
      } else {
        setLoadingMore(true);
      }
      
      setError({ message: null, retry: null });
      
      const params = {
        category: category === 'all' ? undefined : category, // Don't send 'all' as category
        country,
        page: currentPage,
        pageSize: 8,
        ...(selectedDate && { 
          from: new Date(selectedDate.setHours(0, 0, 0, 0)).toISOString().split('.')[0] + 'Z',
          to: new Date(selectedDate.setHours(23, 59, 59, 999)).toISOString().split('.')[0] + 'Z'
        })
      };
      
      // Remove undefined parameters
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
      
      console.log('Fetching news with params:', params);
      const response = await api.get(`/news/headlines`, {
        params,
        timeout: 10000 // 10 second timeout
      });
      
      console.log('News API Response:', response.data);
      
      if (!response.data) {
        throw new Error('Empty response from server');
      }
      
      // Handle both GNews API response format and our transformed format
      const articles = response.data.articles || response.data || [];
      
      if (!Array.isArray(articles)) {
        throw new Error('Invalid response format: articles is not an array');
      }
      
      // Transform articles to ensure they have all required fields
      const processedArticles = articles.map(article => ({
        ...article,
        title: article.title || 'No title available',
        description: article.description || 'No description available',
        url: article.url || '#',
        urlToImage: article.image || article.urlToImage || null,
        publishedAt: article.publishedAt || new Date().toISOString(),
        source: article.source || { name: article.source?.name || 'Unknown Source' }
      }));
      
      setArticles(prevArticles => 
        loadMore ? [...prevArticles, ...processedArticles] : processedArticles
      );
      
      setPage(currentPage);
      // If we got fewer articles than requested, assume there are no more
      setHasMore(processedArticles.length >= (params.max || params.pageSize || 8));
    } catch (err) {
      console.error('Error fetching news:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load news. Please try again later.';
      
      setError({ 
        message: errorMessage,
        retry: () => fetchNews(loadMore)
      });
      
      if (!loadMore) {
        setArticles([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchNews(true);
    }
  };
  
  const handleDateChange = (date) => {
    setSelectedDate(date);
  };
  
  const handleCountryChange = (event) => {
    setCountry(event.target.value);
  };
  
  const handleClearFilters = () => {
    setSelectedDate(null);
    setCategory('general');
    setCountry('in');
    setPage(1);
  };

  useEffect(() => {
    fetchNews();
  }, [category, country, selectedDate]);

  const handleCategoryChange = (event, newCategory) => {
    if (newCategory !== null) {
      setCategory(newCategory);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Latest News
          </Typography>
          
          {/* Weather Widget */}
          <Box sx={{ mb: 3 }}>
            <WeatherWidget country={country} />
          </Box>
          
          {/* Filters */}
          <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" alignItems="center">
              <TextField
                select
                label="Country"
                value={country}
                onChange={handleCountryChange}
                variant="outlined"
                size="small"
                sx={{ minWidth: 200 }}
              >
                {countries.map((option) => (
                  <MenuItem key={option.code} value={option.code}>
                    {option.name}
                  </MenuItem>
                ))}
              </TextField>
              
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Filter by Date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  slotProps={{
                    textField: {
                      size: 'small',
                      sx: { minWidth: 200 }
                    }
                  }}
                />
              </LocalizationProvider>
              
              <Button 
                variant="outlined" 
                onClick={handleClearFilters}
                sx={{ height: 40 }}
              >
                Clear Filters
              </Button>
            </Stack>
          </Paper>
          
          {/* Category Tabs */}
          <Box sx={{ mb: 3 }}>
            <ToggleButtonGroup
              value={category}
              exclusive
              onChange={handleCategoryChange}
              aria-label="news category"
              sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}
            >
              {categories.map((cat) => (
                <ToggleButton 
                  key={cat} 
                  value={cat}
                  sx={{ 
                    textTransform: 'capitalize',
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      }
                    }
                  }}
                >
                  {cat}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Box>

      {error.message ? (
        <Box textAlign="center" py={4}>
          <Typography color="error" gutterBottom>{error.message}</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={error.retry}
            sx={{ mt: 2 }}
          >
            Retry
          </Button>
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {articles.map((article, index) => (
              <Grid key={`${article.url}-${index}`} xs={12} sm={6} md={4} lg={3} sx={{ display: 'flex' }}>
                <NewsCard article={article} />
              </Grid>
            ))}
          </Grid>
          
          {!loading && articles.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="textSecondary">
                No articles found. Try adjusting your filters.
              </Typography>
            </Box>
          )}
          
          {!loading && hasMore && (
            <Box textAlign="center" mt={4}>
              <Button 
                variant="outlined" 
                onClick={handleLoadMore}
                disabled={loadingMore}
                startIcon={loadingMore ? <CircularProgress size={20} /> : null}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </Button>
            </Box>
          )}
          
          {loading && (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          )}
        </>
      )}
    </Container>
    </LocalizationProvider>
  );
};

export default NewsList;
