import React, { useState, useEffect, useContext } from 'react';
import { styled } from '@mui/material/styles';
import {
  Container,
  Typography,
  Box,
  useTheme,
} from '@mui/material';
import NewsWidget from '../components/NewsWidget';
import { NEWS_SECTIONS } from '../components/NewsWidget';
import { useAuth } from '../context/AuthContext';
import AlertContext from '../context/alert/alertContext';
import WeatherWidget from '../components/WeatherWidget';
import { fetchGNews, getFallbackNews } from '../services/newsService';
import Navbar from '../components/layout/Navbar';

// Styled components
const HeaderSection = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(135deg, #0d4d8d 0%, #032e6e 100%)',
  color: theme.palette.common.white,
  padding: theme.spacing(4, 0),
  position: 'relative',
  minHeight: '350px',
  minWidth: '450px',
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  borderRadius: '16px',
  overflow: 'hidden',
  marginBottom: theme.spacing(4),
  [theme.breakpoints.down('sm')]: {
    padding: 0,
  }
}));

const WeatherWidgetContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  right: 24,
  transform: 'translateY(-50%)',
  zIndex: 1,
  minHeight: '220px',
  minWidth: '280px',
  backdropFilter: 'blur(8px)',
  backgroundColor: 'rgba(255, 255, 255, 0.15)',
  borderRadius: '12px',
  padding: theme.spacing(2),
  border: '1px solid rgba(255, 255, 255, 0.2)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  [theme.breakpoints.down('lg')]: {
    position: 'relative',
    right: 0,
    top: 0,
    transform: 'none',
    marginTop: theme.spacing(3),
    width: '100%',
    minHeight: '200px',
  },
  [theme.breakpoints.down('sm')]: {
    minHeight: 'auto',
    marginTop: theme.spacing(2),
  },
}));

// Get the current time of day for a personalized greeting
const getGreeting = (user) => {
  const hour = new Date().getHours();
  let greeting = '';
  
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';
  else greeting = 'Good evening';
  
  if (user?.username) {
    const firstName = user.username.split(' ')[0];
    return `${greeting}, ${firstName}`;
  }
  
  return greeting;
};

const Dashboard = () => {
  const { user } = useAuth();
  const alertContext = useContext(AlertContext);
  const [isLoading, setIsLoading] = useState(true);
  const [news, setNews] = useState([]);
  const [filters, setFilters] = useState({
    country: 'in', // Default to India
    category: 'general',
    fromDate: null,
    toDate: null,
    q: ''
  });
  const [activeSection, setActiveSection] = useState('breaking');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const theme = useTheme();

  // Fetch news when component mounts or filters change
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setIsLoading(true);
        const newsData = await fetchGNews(
          filters.category,
          filters.country,
          20 // max number of articles
        );
        setNews(newsData || []);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error fetching news:', error);
        // Fallback to sample data if API fails
        const fallbackNews = await getFallbackNews(filters.category);
        setNews(fallbackNews);
        alertContext.setAlert('Using sample news data', 'info');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchNews();
  }, [filters, alertContext]);

  // Handle filter changes from NewsWidget
  const handleFilterChange = (newFilters) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters
    }));
  };

  // Handle section change
  const handleSectionChange = (sectionId) => {
    const section = NEWS_SECTIONS.find(s => s.id === sectionId);
    if (section) {
      setActiveSection(sectionId);
      setFilters(prev => ({
        ...prev,
        category: section.apiCategory || 'general'
      }));
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    // This will trigger the useEffect to refetch news
    setFilters(prev => ({ ...prev }));
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
        <HeaderSection>
          <Container>
            <Box sx={{ maxWidth: '60%', [theme.breakpoints.down('lg')]: { maxWidth: '100%' } }}>
              <Typography variant="h4" component="h1" gutterBottom>
                {getGreeting(user)}
              </Typography>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 400, opacity: 0.9 }}>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Typography>
            </Box>
            <WeatherWidgetContainer>
              <WeatherWidget country={filters.country} />
            </WeatherWidgetContainer>
          </Container>
        </HeaderSection>

        <NewsWidget 
          news={news}
          loading={isLoading}
          country={filters.country}
          category={filters.category}
          fromDate={filters.fromDate}
          toDate={filters.toDate}
          onFilterChange={handleFilterChange}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
        />
      </Container>
    </>
  );
};

export default Dashboard;