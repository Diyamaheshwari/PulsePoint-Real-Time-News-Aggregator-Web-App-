import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
  useScrollTrigger,
  alpha,
  useTheme,
  Container,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  ExitToApp as LogoutIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Article as ArticleIcon,
  Home as HomeIcon,
  ExpandMore as ExpandMoreIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  PostAdd as PostAddIcon,
  Poll as PollIcon,
} from '@mui/icons-material';
import { useTheme as useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import AlertContext from '../../context/alert/alertContext';
import HideOnScroll from './HideOnScroll';

const Navbar = (props) => {
  // Menu configuration constants
  const menuAnchorOrigin = {
    vertical: 'bottom',
    horizontal: 'right',
  };
  const menuTransformOrigin = {
    vertical: 'top',
    horizontal: 'right',
  };
  const menuPaperProps = {
    elevation: 0,
    sx: {
      overflow: 'visible',
      filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
      mt: 1.5,
      '& .MuiAvatar-root': {
        width: 32,
        height: 32,
        ml: -0.5,
        mr: 1,
      },
      '&:before': {
        content: '""',
        display: 'block',
        position: 'absolute',
        top: 0,
        right: 14,
        width: 10,
        height: 10,
        bgcolor: 'background.paper',
        transform: 'translateY(-50%) rotate(45deg)',
        zIndex: 0,
      },
    },
  };

  // Get all hooks at the top
  const { onFilterChange = () => {} } = props;
  const { user, isAuthenticated, loading, logout } = useAuth();
  const alertContext = useContext(AlertContext);
  const { setAlert } = alertContext;
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { mode, toggleTheme } = useAppTheme();
  
  // State hooks
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [country, setCountry] = useState('us');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const isAdmin = user?.role === 'admin';
  
  // Scroll effect
  useEffect(() => {
    if (loading) return;
    
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled, loading]);
  
  // Show loading state while checking authentication
  if (loading) {
    return null; // or return a loading spinner
  }

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };


  const handleCountryChange = (event) => {
    const newCountry = event.target.value;
    setCountry(newCountry);
    
    // Update URL with new country
    const params = new URLSearchParams(window.location.search);
    params.set('country', newCountry);
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    
    // Trigger filter change in parent
    onFilterChange({ country: newCountry });
  };

  const handleDateChange = (date, type) => {
    if (type === 'from') {
      setFromDate(date);
      // Update URL with new date
      const params = new URLSearchParams(window.location.search);
      if (date) {
        params.set('fromDate', date.toISOString());
      } else {
        params.delete('fromDate');
      }
      window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
      
      // Trigger filter change in parent
      onFilterChange({ fromDate: date });
    } else {
      setToDate(date);
      // Update URL with new date
      const params = new URLSearchParams(window.location.search);
      if (date) {
        params.set('toDate', date.toISOString());
      } else {
        params.delete('toDate');
      }
      window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
      
      // Trigger filter change in parent
      onFilterChange({ toDate: date });
    }
  };

  const onLogout = () => {
    try {
      // Call the logout function from auth context
      logout('Logged out successfully');
      
      // Redirect to login page
      navigate('/login', { 
        replace: true,
        state: { from: window.location.pathname }
      });
    } catch (error) {
      console.error('Logout error:', error);
      setAlert('Failed to log out', 'error');
    } finally {
      handleUserMenuClose();
    }
};

  const authLinks = (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <IconButton
        onClick={handleUserMenuOpen}
        sx={{
          p: 0.5,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
       <Avatar 
  sx={{ 
    width: 36, 
    height: 36,
    bgcolor: theme.palette.primary.main,
    color: 'white',
    fontSize: '1rem',
    fontWeight: 600,
    border: `2px solid ${theme.palette.primary.light}`,
    '&:hover': {
      transform: 'scale(1.05)',
      transition: 'transform 0.2s ease-in-out',
    },
  }}
>
  {user?.name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
</Avatar>
      </IconButton>
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        anchorOrigin={menuAnchorOrigin}
        transformOrigin={menuTransformOrigin}
        PaperProps={menuPaperProps}
      >
        <MenuItem 
          component={RouterLink} 
          to="/profile"
          onClick={handleUserMenuClose}
          sx={{ minWidth: '180px', py: 1.5 }}
        >
          <PersonIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
          Profile
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => {
            handleUserMenuClose();
            onLogout();
          }}
          sx={{ 
            minWidth: '180px', 
            py: 1.5,
            color: theme.palette.error.main,
            '&:hover': {
              backgroundColor: theme.palette.error.veryLight,
            }
          }}
        >
          <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );

  // Menu configuration constants are already defined at the top of the component

  const guestLinks = (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <IconButton
        onClick={handleUserMenuOpen}
        sx={{
          p: 0.5,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          },
        }}
      >
        <Avatar 
          sx={{ 
            width: 32, 
            height: 32,
            bgcolor: theme.palette.primary.main,
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          {user?.name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        anchorOrigin={menuAnchorOrigin}
        transformOrigin={menuTransformOrigin}
        PaperProps={menuPaperProps}
      >
        <MenuItem 
          component={RouterLink} 
          to="/profile"
          onClick={handleUserMenuClose}
          sx={{ minWidth: '160px' }}
        >
          <PersonIcon fontSize="small" sx={{ mr: 1.5 }} />
          Profile
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => {
            handleUserMenuClose();
            onLogout();
          }}
          sx={{ minWidth: '160px', color: theme.palette.error.main }}
        >
          <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );

  return (
    <HideOnScroll>
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        className="nav-glass"
        sx={{
          '&.nav-glass': {
            background: 'rgba(255, 255, 255, 0.95) !important',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 0, 0, 0.1) !important',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05) !important',
            color: theme.palette.text.primary,
            '& .MuiButton-root': {
              color: theme.palette.text.primary,
              '&:hover': {
                color: theme.palette.primary.main,
                backgroundColor: 'rgba(0, 0, 0, 0.03)',
              },
            },
            '& .MuiIconButton-root': {
              color: theme.palette.text.primary,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
              },
            },
          },
        }}
      >
        <Container maxWidth="xl">
          <Toolbar
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              px: { xs: 2, sm: 4 },
              py: 1,
              maxWidth: '1600px',
              width: '100%',
              margin: '0 auto',
            }}
          >
            {/* Logo / Brand */}
            <Button
              component={RouterLink}
              to="/dashboard"
              className="btn-glass"
              sx={{
                mr: 2,
                display: 'flex',
                alignItems: 'center',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '1.2rem',
                '&.btn-glass': {
                  backgroundColor: 'rgba(255, 255, 255, 0.3) !important',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.4) !important',
                  },
                },
              }}
            >
              <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                <Typography
                  variant="h6"
                  component={RouterLink}
                  to="/"
                  sx={{
                    fontWeight: 800,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    background: (theme) => theme.palette.mode === 'dark' 
                      ? 'linear-gradient(45deg, #64b5f6 0%, #1e88e5 100%)' 
                      : 'linear-gradient(45deg, #1976d2 0%, #0d47a1 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textFillColor: 'transparent',
                    '&:hover': {
                      opacity: 0.9,
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  PulsePoint
                </Typography>
                
                <Box sx={{ display: 'flex', ml: 2 }}>
                  <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
                    <IconButton 
                      onClick={toggleTheme} 
                      color="inherit"
                      sx={{ ml: 1 }}
                      aria-label="toggle theme"
                    >
                      {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Button>

            {/* Navigation Links */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, ml: 4, gap: 1 }}>
              <Button
                component={RouterLink}
                to="/home"
                color={scrolled ? 'primary' : 'inherit'}
                startIcon={<HomeIcon />}
                sx={{
                  fontWeight: 500,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.common.white, 0.1),
                  },
                }}
              >
                Home
              </Button>
              <Button
                component={RouterLink}
                to="/news"
                color={scrolled ? 'primary' : 'inherit'}
                startIcon={<ArticleIcon />}
                sx={{
                  fontWeight: 500,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.common.white, 0.1),
                  },
                }}
              >
                News
              </Button>
            </Box>

            {/* Mobile Menu */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexGrow: 1, justifyContent: 'flex-end' }}>
              <IconButton
                size="large"
                aria-label="show more"
                aria-haspopup="true"
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
            </Box>

            {/* Action Buttons - Removed as per requirements */}

            {/* Auth Links */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center'
            }}>
              {isAuthenticated ? (
                <>
                  {authLinks}
                  <Menu
                    anchorEl={userMenuAnchor}
                    open={Boolean(userMenuAnchor)}
                    onClose={handleUserMenuClose}
                    anchorOrigin={menuAnchorOrigin}
                    transformOrigin={menuTransformOrigin}
                    PaperProps={menuPaperProps}
                  >
                    <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <Typography variant="subtitle2" fontWeight="600">
                        {user?.name || 'User'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user?.email || ''}
                      </Typography>
                    </Box>
                    
                    <MenuItem 
                      component={RouterLink} 
                      to="/profile" 
                      onClick={handleUserMenuClose}
                      sx={{ py: 1.5 }}
                    >
                      <PersonIcon sx={{ mr: 1.5, color: 'text.secondary' }} /> 
                      Profile
                    </MenuItem>
                    
                    {isAdmin && (
                      <MenuItem 
                        component={RouterLink} 
                        to="/admin" 
                        onClick={handleUserMenuClose}
                        sx={{ py: 1.5 }}
                      >
                        <AdminPanelSettingsIcon sx={{ mr: 1.5, color: 'text.secondary' }} /> 
                        Admin Dashboard
                      </MenuItem>
                    )}
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <MenuItem 
                      onClick={onLogout}
                      sx={{ py: 1.5, color: theme.palette.error.main }}
                    >
                      <LogoutIcon sx={{ mr: 1.5 }} /> 
                      Logout
                    </MenuItem>
                  </Menu>
                </>
              ) : guestLinks}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
    </HideOnScroll>
  );
};

Navbar.propTypes = {
  onFilterChange: PropTypes.func
};

export default Navbar;
