import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CircularProgress, 
  Button, 
  Container,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  IconButton,
  InputAdornment
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  Search as SearchIcon,
  Refresh as RefreshIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Category as CategoryIcon,
  Visibility as VisibilityIcon,
  Whatshot as TrendingIcon,
  NewReleases as BreakingNewsIcon,
  Article as AllNewsIcon,
  Comment as CommentIcon,
  Bookmark as BookmarkIcon,
  Share as ShareIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { format, isToday } from 'date-fns';
import { Grid, Chip, CardMedia, Tooltip, Paper, Stack } from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import NewsFeed from '../components/news/NewsFeed';
import { useAuth } from '../context/AuthContext';

// API configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Available categories and countries
const CATEGORIES = [
  'top', 'business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'
];

const COUNTRIES = [
  { code: 'us', name: 'United States' },
  { code: 'gb', name: 'United Kingdom' },
  { code: 'in', name: 'India' },
  { code: 'au', name: 'Australia' },
  { code: 'ca', name: 'Canada' },
];

// Styled Components
const NewsCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const NewsCardContent = styled(CardContent)(({ theme }) => ({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(2),
}));

const News = ({ 
  initialCategory = 'general',
  onTabChange,
  activeTab: propActiveTab = 0,
  tabLabels: propTabLabels
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('grid');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(propActiveTab);

  // Tab labels - use prop if provided, otherwise use default
  const tabLabels = propTabLabels || [
    { label: 'Top Stories', icon: <CategoryIcon />, key: 'top' },
    { label: 'Most Viewed', icon: <VisibilityIcon />, key: 'most-viewed' },
    { label: 'Trending', icon: <TrendingIcon />, key: 'trending' },
    { label: 'Breaking', icon: <BreakingNewsIcon />, key: 'breaking' },
    { label: 'All News', icon: <AllNewsIcon />, key: 'all' }
  ];

  // News categories state
  const [newsData, setNewsData] = useState({
    top: { articles: [], loading: true, page: 1, hasMore: true },
    'most-viewed': { articles: [], loading: false, page: 1, hasMore: true },
    trending: { articles: [], loading: false, page: 1, hasMore: true },
    breaking: { articles: [], loading: false, page: 1, hasMore: true },
    all: { articles: [], loading: false, page: 1, hasMore: true }
  });

  // Filter state
  const [filters, setFilters] = useState({
    country: 'us',
    category: initialCategory,
    searchQuery: ''
  });
  
  const { category: selectedCategory, country: selectedCountry, searchQuery } = filters;
  
  const fetchNews = useCallback(async (type = 'top', page = 1, isFilterChange = false) => {
    // Validate type
    if (!type) {
      console.error('No type provided to fetchNews');
      return;
    }
    
    // Skip if already loading or no more data to load
    if ((newsData[type]?.loading) || (!newsData[type]?.hasMore && page > 1)) return;

    try {
      setNewsData(prev => ({
        ...prev,
        [type]: { 
          ...prev[type], 
          loading: true, 
          error: null 
        }
      }));

      // Simulate API call with mock data including filters
      const mockNews = Array(10).fill().map((_, i) => ({
        id: `${type}-${filters.country}-${filters.category}-${page}-${i}-${Date.now()}`,
        title: `${type.replace(/\b\w/g, l => l.toUpperCase())} News Item ${i + 1 + ((page - 1) * 10)} (${filters.country.toUpperCase()}, ${filters.category})`,
        description: `This is a ${filters.category} news article from ${COUNTRIES.find(c => c.code === filters.country)?.name || filters.country}.`,
        url: `#${type}-${i}`,
        urlToImage: `https://source.unsplash.com/random/400x300?${type},${filters.category},${filters.country},${i},${Date.now()}`,
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        source: { 
          name: type === 'breaking' ? 'Breaking News' : 
                `${filters.category.charAt(0).toUpperCase() + filters.category.slice(1)} News` 
        },
        category: filters.category,
        country: filters.country,
        views: Math.floor(Math.random() * 10000)
      }));

      // Simulate network delay with cleanup
      let isMounted = true;
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!isMounted) return;

      setNewsData(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          articles: page === 1 ? mockNews : [...(prev[type]?.articles || []), ...mockNews],
          loading: false,
          page: page + 1,
          hasMore: page < 3 // Limit to 3 pages for demo
        }
      }));

      return () => { isMounted = false; };
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      setNewsData(prev => ({
        ...prev,
        [type]: { 
          ...prev[type],
          loading: false, 
          error: 'Failed to load news. Please try again later.' 
        }
      }));
    }
  }, [newsData, filters]);


  // Sync active tab with prop if it changes
  useEffect(() => {
    setActiveTab(propActiveTab);
  }, [propActiveTab]);

  
  const handleTabChangeInternal = (event, newValue) => {
    if (onTabChange) {
      onTabChange(event, newValue);
    } else {
      setActiveTab(newValue);
    }
    
    // Fetch news for the new tab if needed
    const type = tabLabels[newValue]?.key;
    if (type && newsData[type]?.articles?.length === 0) {
      fetchNews(type);
    }
  };

  const setSearchQuery = (value) => {
    setFilters(prev => ({
      ...prev,
      searchQuery: value
    }));
  };

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleRefresh = () => {
    const currentTabKey = tabLabels[activeTab].key;
    fetchNews(currentTabKey, 1, true);
  };

  const handleCategoryChange = (event) => {
    handleFilterChange('category', event.target.value);
  };

  const handleCountryChange = (event) => {
    handleFilterChange('country', event.target.value);
  };

  const handleSearch = (event) => {
    if (event.key === 'Enter') {
      handleFilterChange('searchQuery', event.target.value);
    }
  };

  const toggleView = () => {
    setView(view === 'grid' ? 'list' : 'grid');
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));

    // Reset and refetch news when filters change
    const currentTabKey = tabLabels[activeTab].key;
    setNewsData(prev => ({
      ...prev,
      [currentTabKey]: { 
        ...prev[currentTabKey],
        articles: [],
        page: 1,
        hasMore: true
      }
    }));
    
    // Small delay to allow state to update before fetching
    setTimeout(() => {
      fetchNews(currentTabKey, 1, true);
    }, 100);
  };

  const loadMore = () => {
    const currentTab = tabLabels[activeTab].key;
    if (!newsData[currentTab].loading && newsData[currentTab].hasMore) {
      fetchNews(currentTab, newsData[currentTab].page);
    }
  };

  // Initial load and when category changes
  useEffect(() => {
    let isMounted = true;
    
    if (isMounted) {
      const type = tabLabels[activeTab]?.key || 'top';
      if (type && newsData[type]?.articles?.length === 0) {
        fetchNews(type);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [initialCategory, tabLabels, newsData, fetchNews]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return isToday(date) 
        ? format(date, 'h:mm a') 
        : format(date, 'MMM d, yyyy');
    } catch (e) {
      return '';
    }
  };

  // Get current articles based on active tab
  const getCurrentArticles = () => {
    const currentTab = tabLabels[activeTab]?.key || 'top';
    return newsData[currentTab]?.articles || [];
  };

  const articles = getCurrentArticles();

  const handleArticleClick = (article) => {
    // Navigate to article detail page
    navigate(`/news/article/${article.id}`, { 
      state: { 
        article,
        from: window.location.pathname // Keep track of where we came from
      } 
    });
  };

  const handleCommentClick = (e, article) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Navigate to the article detail page with the article data
    navigate(`/news/article/${article.id}`, { 
      state: { 
        article,
        scrollToComments: true,
        from: window.location.pathname
      }
    });
  };

  const renderNewsCard = (article, index, type) => {
    const handleCardClick = (e) => {
      // Only navigate if the click wasn't on a button or link
      if (!e.target.closest('button, a, [role="button"]')) {
        handleArticleClick(article);
      }
    };

    return (
      <NewsCard key={`${type}-${index}`} onClick={handleCardClick} sx={{ cursor: 'pointer' }}>
        {type === 'breaking' && (
          <Chip 
            size="small" 
            label="Breaking" 
            color="error"
            icon={<BreakingNewsIcon fontSize="small" />} 
            sx={{ m: 1 }}
          />
        )}
        
        <Box sx={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
          <CardMedia
            component="img"
            image={article.urlToImage || 'https://via.placeholder.com/400x225?text=No+Image'}
            alt={article.title}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </Box>
        
        <NewsCardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Chip 
              label={type === 'trending' ? 'Trending' : article.source?.name || 'News'} 
              size="small" 
              color={type === 'trending' ? 'secondary' : 'default'}
              sx={{ fontWeight: 600, fontSize: '0.7rem' }}
            />
            {type === 'mostViewed' && (
              <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                <VisibilityIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="caption">
                  {article.views?.toLocaleString() || '1.2k'}
                </Typography>
              </Box>
            )}
          </Box>
          
          <Typography 
            variant="subtitle1" 
            component="h3"
            sx={{
              fontWeight: 600,
              mb: 1,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '4.5em',
              lineHeight: 1.3,
            }}
          >
            {article.title}
          </Typography>
          
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '4.5em',
              fontSize: '0.875rem',
            }}
          >
            {article.description || 'No description available'}
          </Typography>
          
          <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Typography variant="body2" color="text.secondary">
              {formatDate(article.publishedAt)} • {article.views} views
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Comment">
                <IconButton 
                  size="small" 
                  onClick={(e) => handleCommentClick(e, article)}
                  sx={{ color: 'text.secondary' }}
                >
                  <CommentIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Save">
                <IconButton size="small" sx={{ color: 'text.secondary' }}>
                  <BookmarkIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Share">
                <IconButton size="small" sx={{ color: 'text.secondary' }}>
                  <ShareIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </NewsCardContent>
      </NewsCard>
    );
  };

  const renderFilters = () => (
    <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Stack direction={isMobile ? 'column' : 'row'} spacing={2} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Country</InputLabel>
          <Select
            value={filters.country}
            label="Country"
            onChange={(e) => handleFilterChange('country', e.target.value)}
          >
            {COUNTRIES.map((country) => (
              <MenuItem key={country.code} value={country.code}>
                {country.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={filters.category}
            label="Category"
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            {CATEGORIES.map((category) => (
              <MenuItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="Search news..."
          value={filters.searchQuery}
          onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
          sx={{ flexGrow: 1 }}
          placeholder="Type to search..."
        />
      </Stack>
    </Paper>
  );

  const renderTabContent = (type) => {
    const tabData = newsData[type] || {};
    const { articles = [], loading = false, hasMore = false, error = null } = tabData;
    
    if (loading && articles.length === 0) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
          <Button 
            variant="outlined" 
            onClick={() => fetchNews(type, 1)}
            startIcon={<ArrowForwardIcon />}
          >
            Retry
          </Button>
        </Box>
      );
    }

    if (articles.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">No articles found in this category.</Typography>
        </Box>
      );
    }

    return (
      <>
        <Grid container spacing={3}>
          {articles.map((article, index) => (
            <Grid key={`${type}-${index}`} xs={12} sm={6} md={4} lg={3}>
              {renderNewsCard(article, index, type)}
            </Grid>
          ))}
        </Grid>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && hasMore && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Button 
              variant="outlined" 
              onClick={() => loadMore()}
              disabled={loading}
              startIcon={!loading && <ArrowForwardIcon />}
            >
              {loading ? 'Loading...' : 'Load More'}
            </Button>
          </Box>
        )}
      </>
    );
  };

  return (
    <Box sx={{ py: 4, bgcolor: 'background.default' }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1">
              Latest News
            </Typography>
            <Box>
              <IconButton onClick={toggleView} color="primary">
                {view === 'grid' ? <ViewListIcon /> : <ViewModuleIcon />}
              </IconButton>
              <IconButton onClick={handleRefresh} color="primary" disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={handleCategoryChange}
              >
                {CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel>Country</InputLabel>
              <Select
                value={selectedCountry}
                label="Country"
                onChange={handleCountryChange}
              >
                {COUNTRIES.map((country) => (
                  <MenuItem key={country.code} value={country.code}>
                    {country.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Search news..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearch}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={fetchNews} edge="end">
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ flexGrow: 1, maxWidth: 400 }}
            />
          </Box>
          
          <Divider sx={{ my: 2 }} />
        </Box>
        
        {error ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="error">{error}</Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={fetchNews}
              startIcon={<RefreshIcon />}
              sx={{ mt: 2 }}
            >
              Retry
            </Button>
          </Box>
        ) : (
          <NewsFeed 
            articles={articles} 
            loading={loading}
            onRefresh={fetchNews}
            view={view}
            onViewChange={setView}
          />
        )}
      </Container>
    </Box>
  );
};

// Helper function for accessibility
function a11yProps(index) {
  return {
    id: `news-tab-${index}`,
    'aria-controls': `news-tabpanel-${index}`,
  };
}

export default News;
