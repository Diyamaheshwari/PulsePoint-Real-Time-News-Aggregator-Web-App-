import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Divider, 
  Popper, 
  Fade, 
  ClickAwayListener,
  Skeleton,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Link } from 'react-router-dom';
import { 
  Category as CategoryIcon, 
  Whatshot as MostViewedIcon, 
  Article as ArticleIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import api from '../../utils/api';

const NewsDropdown = ({ anchorEl, open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [topCategories, setTopCategories] = useState([]);
  const [mostViewed, setMostViewed] = useState([]);
  const [loading, setLoading] = useState({ categories: true, mostViewed: true });
  const [activeTab, setActiveTab] = useState('categories');

  useEffect(() => {
    const fetchData = async () => {
      if (!open) return;
      
      try {
        setLoading({ categories: true, mostViewed: true });
        
        // Fetch both in parallel
        const [categoriesResponse, mostViewedResponse] = await Promise.all([
          api.get('/news/top-categories'),
          api.get('/news/most-viewed')
        ]);
        
        setTopCategories(categoriesResponse.data || []);
        setMostViewed(mostViewedResponse.data || []);
      } catch (error) {
        console.error('Error fetching news data:', error);
      } finally {
        setLoading({ categories: false, mostViewed: false });
      }
    };

    fetchData();
  }, [open]);

  const renderSkeleton = (count = 5) => (
    <Box>
      {Array.from({ length: count }).map((_, index) => (
        <Box key={index} sx={{ mb: 1 }}>
          <Skeleton variant="text" width="100%" height={24} />
          <Skeleton variant="text" width="60%" height={16} />
        </Box>
      ))}
    </Box>
  );

  const renderCategoryLink = (category, icon, label) => (
    <ListItem 
      button 
      key={category}
      component={Link}
      to={`/news/${category}`}
      onClick={onClose}
      sx={{
        borderRadius: 1,
        '&:hover': {
          backgroundColor: 'action.hover',
        },
      }}
    >
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText 
        primary={label} 
        primaryTypographyProps={{
          fontWeight: 500,
          color: 'text.primary',
        }}
      />
    </ListItem>
  );

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement={isMobile ? 'bottom' : 'bottom-start'}
      transition
      disablePortal
      style={{ zIndex: 1300, width: isMobile ? '90vw' : '350px', maxWidth: '100%' }}
    >
      {({ TransitionProps }) => (
        <ClickAwayListener onClickAway={onClose}>
          <Fade {...TransitionProps} timeout={150}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 2, 
                mt: 1,
                maxHeight: '70vh',
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: theme.palette.primary.main,
                  borderRadius: '3px',
                },
              }}
            >
              {/* Quick Links */}
              <Box display="flex" mb={2} borderBottom={1} borderColor="divider">
                <Chip
                  icon={<CategoryIcon />}
                  label="Top Categories"
                  onClick={() => setActiveTab('categories')}
                  color={activeTab === 'categories' ? 'primary' : 'default'}
                  variant={activeTab === 'categories' ? 'filled' : 'outlined'}
                  sx={{ mr: 1, mb: 1 }}
                />
                <Chip
                  icon={<MostViewedIcon />}
                  label="Most Viewed"
                  onClick={() => setActiveTab('mostViewed')}
                  color={activeTab === 'mostViewed' ? 'primary' : 'default'}
                  variant={activeTab === 'mostViewed' ? 'filled' : 'outlined'}
                  sx={{ mb: 1 }}
                />
              </Box>

              {/* Content */}
              <Box>
                {activeTab === 'categories' ? (
                  <Box>
                    <Box display="flex" alignItems="center" mb={1}>
                      <CategoryIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" component="h3">
                        Top Categories
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    
                    {loading.categories ? (
                      renderSkeleton(5)
                    ) : topCategories.length > 0 ? (
                      <List disablePadding>
                        {topCategories.map((category, index) => (
                          <ListItem 
                            key={index} 
                            button 
                            component={Link} 
                            to={`/news/category/${encodeURIComponent(category.name.toLowerCase())}`}
                            onClick={onClose}
                            sx={{
                              borderRadius: 1,
                              mb: 0.5,
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              }
                            }}
                          >
                            <ListItemIcon>
                              <ArticleIcon color="action" />
                            </ListItemIcon>
                            <ListItemText 
                              primary={category.name}
                              primaryTypographyProps={{
                                fontWeight: 'medium',
                                noWrap: true,
                                title: category.name
                              }}
                              secondary={`${category.count} articles`}
                              secondaryTypographyProps={{
                                variant: 'caption',
                                color: 'text.secondary'
                              }}
                            />
                            <Chip 
                              label="View" 
                              size="small" 
                              color="primary"
                              variant="outlined"
                              sx={{ ml: 1 }}
                            />
                          </ListItem>
                        ))}
                      </List>
                  </Box>
                ) : (
                  <Box>
                    <Box display="flex" alignItems="center" mb={1}>
                      <MostViewedIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" component="h3">
                        Most Viewed News
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    
                    {loading.mostViewed ? (
                      renderSkeleton(5)
                    ) : mostViewed.length > 0 ? (
                      <List disablePadding>
                        {mostViewed.map((article, index) => (
                          <ListItem 
                            key={index}
                            button
                            component="a"
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={onClose}
                            sx={{
                              borderRadius: 1,
                              mb: 1,
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              },
                              alignItems: 'flex-start',
                              py: 1.5
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                              <ViewIcon color="action" />
                            </ListItemIcon>
                            <Box>
                              <Typography 
                                variant="subtitle2" 
                                noWrap 
                                sx={{ 
                                  fontWeight: 'medium',
                                  mb: 0.5 
                                }}
                              >
                                {article.title}
                              </Typography>
                              <Box display="flex" alignItems="center">
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    mr: 1.5
                                  }}
                                >
                                  {article.source}
                                </Typography>
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                >
                                  {new Date(article.publishedAt).toLocaleDateString()}
                                </Typography>
                              </Box>
                              {article.viewCount && (
                                <Chip 
                                  size="small"
                                  label={`${article.viewCount} views`}
                                  color="default"
                                  variant="outlined"
                                  sx={{ mt: 0.5, height: 20, fontSize: '0.65rem' }}
                                />
                              )}
                            </Box>
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Box textAlign="center" py={2}>
                        <Typography variant="body2" color="text.secondary">
                          No articles available
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </Paper>
          </Fade>
        </ClickAwayListener>
      )}
    </Popper>
  );
};

export default NewsDropdown;
