// d:\pulsepoint1\pulsepoint\client\src\components\NewsWidget.js
import React, { useState, useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  TextField,
  Tabs,
  Tab,
  CircularProgress,
  Button,
  Collapse,
  Typography
} from '@mui/material';
import { 
  FilterList as FilterListIcon,
  FilterListOff as FilterListOffIcon
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import EnhancedNewsCard from './news/EnhancedNewsCard';

// News sections
export const NEWS_SECTIONS = [
  { 
    id: 'breaking', 
    label: 'Breaking News', 
    showFilters: true, 
    apiCategory: 'general',
    showCategory: true,
    showCountry: true,
    showDateRange: true
  },
  { 
    id: 'business', 
    label: 'Business', 
    showFilters: true, 
    apiCategory: 'business',
    showCategory: false,
    showCountry: true,
    showDateRange: true
  },
  { 
    id: 'technology', 
    label: 'Technology', 
    showFilters: true, 
    apiCategory: 'technology',
    showCategory: false,
    showCountry: true,
    showDateRange: true
  },
  { 
    id: 'sports', 
    label: 'Sports', 
    showFilters: true, 
    apiCategory: 'sports',
    showCategory: false,
    showCountry: true,
    showDateRange: true
  },
  { 
    id: 'entertainment', 
    label: 'Entertainment', 
    showFilters: true, 
    apiCategory: 'entertainment',
    showCategory: false,
    showCountry: true,
    showDateRange: true
  },
  { 
    id: 'health', 
    label: 'Health', 
    showFilters: true, 
    apiCategory: 'health',
    showCategory: false,
    showCountry: true,
    showDateRange: true
  },
  { 
    id: 'science', 
    label: 'Science', 
    showFilters: true, 
    apiCategory: 'science',
    showCategory: false,
    showCountry: true,
    showDateRange: true
  }
];

const NewsWidget = ({ 
  news = [], 
  loading = false, 
  country: propCountry = 'us', 
  category: propCategory = 'general',
  fromDate: propFromDate = null,
  toDate: propToDate = null,
  onFilterChange,
  activeSection: propActiveSection = 'breaking'
}) => {
  const theme = useTheme();
  const [filtersOpen, setFiltersOpen] = useState(true); 
  const [activeSection, setActiveSection] = useState(propActiveSection);
  const [filters, setFilters] = useState({
    country: propCountry,
    category: propCategory,
    fromDate: propFromDate,
    toDate: propToDate,
  });

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveSection(newValue);
    const section = NEWS_SECTIONS.find(s => s.id === newValue);
    if (section && onFilterChange) {
      const updatedFilters = { 
        ...filters,
        category: section.apiCategory || 'general'
      };
      setFilters(updatedFilters);
      onFilterChange(updatedFilters);
    }
  };

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    const section = NEWS_SECTIONS.find(s => s.id === activeSection);
    const category = section?.apiCategory || 'general';
    
    const updatedFilters = { 
      ...filters, 
      ...newFilters,
      // Always use the category from the active section
      category: category
    };
    
    setFilters(updatedFilters);
    if (onFilterChange) {
      onFilterChange(updatedFilters);
    }
  };

  // Get section by ID
  const getActiveSection = () => {
    return NEWS_SECTIONS.find(section => section.id === activeSection) || NEWS_SECTIONS[0];
  };

  // Filter news based on active section and other filters
  const filteredNews = useMemo(() => {
    if (!news || !news.length) return [];
    
    // First filter by category if needed
    let result = [...news];
    
    // Then apply date filters if they exist
    if (filters.fromDate) {
      result = result.filter(article => 
        new Date(article.publishedAt) >= new Date(filters.fromDate)
      );
    }
    
    if (filters.toDate) {
      result = result.filter(article => 
        new Date(article.publishedAt) <= new Date(filters.toDate)
      );
    }
    
    return result;
  }, [news, filters]);

  // Render news item
  const renderNewsItem = (article) => (
    <Grid item xs={12} sm={6} md={4} key={article.id || article.url}>
      <EnhancedNewsCard article={article} />
    </Grid>
  );

  // Render filters
  const renderFilters = () => {
    const activeSection = getActiveSection();
    if (!activeSection.showFilters) return null;

    return (
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          {activeSection.showCountry && (
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Country</InputLabel>
                <Select
                  value={filters.country}
                  onChange={(e) => handleFilterChange({ country: e.target.value })}
                  label="Country"
                >
                  <MenuItem value="us">United States</MenuItem>
                  <MenuItem value="gb">United Kingdom</MenuItem>
                  <MenuItem value="in">India</MenuItem>
                  <MenuItem value="ca">Canada</MenuItem>
                  <MenuItem value="au">Australia</MenuItem>
                  <MenuItem value="de">Germany</MenuItem>
                  <MenuItem value="fr">France</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}
          {activeSection.showDateRange && (
            <>
              <Grid item xs={12} sm={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="From Date"
                    value={filters.fromDate}
                    onChange={(date) => handleFilterChange({ fromDate: date })}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="To Date"
                    value={filters.toDate}
                    onChange={(date) => handleFilterChange({ toDate: date })}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
            </>
          )}
        </Grid>
      </Paper>
    );
  };

  return (
    <Box>
      {/* Tabs and Filter Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Tabs
          value={activeSection}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            mb: 3,
            borderBottom: `1px solid ${theme.palette.divider}`,
            '& .MuiTabs-scrollButtons': {
              '&.Mui-disabled': { opacity: 0.3 },
            },
          }}
        >
          {NEWS_SECTIONS.map((section) => {
            const sectionNews = news.filter(item => 
              section.apiCategory === 'general' 
                ? !item.category || item.category === 'general' 
                : item.category === section.apiCategory
            );
            
            return (
              <Tab 
                key={section.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {section.label}
                    {sectionNews.length > 0 && (
                      <Box 
                        sx={{
                          ml: 1,
                          px: 1,
                          py: 0.25,
                          bgcolor: 'action.selected',
                          borderRadius: 10,
                          fontSize: '0.75rem',
                          fontWeight: 500,
                        }}
                      >
                        {sectionNews.length}
                      </Box>
                    )}
                  </Box>
                }
                value={section.id}
                sx={{ 
                  minWidth: 'auto',
                  px: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  '&.Mui-selected': {
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                  },
                }}
              />
            );
          })}
        </Tabs>
        <Button
          variant="outlined"
          onClick={() => setFiltersOpen(!filtersOpen)}
          startIcon={filtersOpen ? <FilterListIcon /> : <FilterListOffIcon />}
          size="small"
          sx={{ ml: 2 }}
        >
          {filtersOpen ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </Box>

      {/* Filters */}
      <Collapse in={filtersOpen}>
        {renderFilters()}
      </Collapse>

      {/* Loading State */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {news.length > 0 ? (
            news.map(renderNewsItem)
          ) : (
            <Grid item xs={12}>
              <Typography variant="body1" textAlign="center" color="textSecondary">
                No news articles found. Please try different filters.
              </Typography>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default NewsWidget;