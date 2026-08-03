import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Typography, 
  CircularProgress, 
  Card, 
  CardContent, 
  Skeleton,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  styled,
  Button
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon
} from '@mui/icons-material';
import NewsCard from './NewsCard';

const ViewToggle = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginLeft: 'auto',
  '& .MuiIconButton-root': {
    padding: theme.spacing(1),
    marginLeft: theme.spacing(1),
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    '&.active': {
      backgroundColor: alpha(theme.palette.primary.main, 0.2),
    },
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.15),
    }
  }
}));

const NewsFeed = ({ 
  articles = [], 
  title = 'Latest News', 
  loading = false, 
  onRefresh,
  showFilters = true,
  view = 'grid', // 'grid' or 'list'
  onViewChange,
  className 
}) => {
  const theme = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const renderLoadingSkeletons = () => (
    <Grid container spacing={3}>
      {[...Array(8)].map((_, index) => (
        <Grid item key={index} xs={12} sm={6} md={4} lg={3}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Skeleton variant="rectangular" height={140} animation="wave" />
            <CardContent sx={{ flexGrow: 1 }}>
              <Skeleton width="80%" height={32} animation="wave" style={{ marginBottom: 16 }} />
              <Skeleton width="100%" height={16} animation="wave" style={{ marginBottom: 8 }} />
              <Skeleton width="100%" height={16} animation="wave" style={{ marginBottom: 8 }} />
              <Skeleton width="60%" height={16} animation="wave" />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderEmptyState = () => (
    <Box 
      sx={{ 
        py: 8, 
        textAlign: 'center',
        backgroundColor: alpha(theme.palette.background.paper, 0.5),
        borderRadius: 2,
        border: `1px dashed ${theme.palette.divider}`,
      }}
    >
      <Typography variant="h6" color="textSecondary" gutterBottom>
        No articles found
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Try adjusting your search or filter criteria
      </Typography>
      {onRefresh && (
        <Button 
          variant="outlined" 
          color="primary" 
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      )}
    </Box>
  );

  return (
    <Box className={className}>
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 4,
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Typography 
          variant="h5" 
          component="h2" 
          sx={{ 
            fontWeight: 600,
            color: 'text.primary',
            position: 'relative',
            '&:after': {
              content: '""',
              position: 'absolute',
              bottom: -8,
              left: 0,
              width: 48,
              height: 4,
              backgroundColor: 'primary.main',
              borderRadius: 2
            }
          }}
        >
          {title}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {onViewChange && (
            <ViewToggle>
              <Tooltip title="Grid view">
                <IconButton 
                  size="small" 
                  onClick={() => onViewChange('grid')}
                  className={view === 'grid' ? 'active' : ''}
                >
                  <ViewModuleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="List view">
                <IconButton 
                  size="small" 
                  onClick={() => onViewChange('list')}
                  className={view === 'list' ? 'active' : ''}
                >
                  <ViewListIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </ViewToggle>
          )}
          
          {onRefresh && (
            <Tooltip title="Refresh news">
              <IconButton 
                onClick={handleRefresh} 
                disabled={isRefreshing || loading}
                size="small"
                sx={{ 
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  }
                }}
              >
                <RefreshIcon 
                  fontSize="small" 
                  sx={{
                    animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {loading ? (
        renderLoadingSkeletons()
      ) : !articles || articles.length === 0 ? (
        renderEmptyState()
      ) : (
        <Grid container spacing={3}>
          {articles.map((article, index) => (
            <Grid 
              item 
              key={article.url || index} 
              xs={12} 
              sm={view === 'list' ? 12 : 6} 
              md={view === 'list' ? 12 : 4} 
              lg={view === 'list' ? 12 : 3}
            >
              <NewsCard 
                article={article} 
                variant={view === 'list' ? 'horizontal' : 'vertical'}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default NewsFeed;
