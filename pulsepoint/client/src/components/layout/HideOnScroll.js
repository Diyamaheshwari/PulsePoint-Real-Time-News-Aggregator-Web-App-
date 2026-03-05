import React from 'react';
import { useLocation } from 'react-router-dom';
import { AppBar, useScrollTrigger } from '@mui/material';

const HideOnScroll = (props) => {
  const { children } = props;
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 0,
    enabled: !isDashboard // Disable scroll trigger for dashboard
  });
  
  // Special styling for dashboard
  const dashboardStyles = {
    background: 'rgba(255, 255, 255, 0.95) !important',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1) !important',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05) !important',
  };

  // Default scroll behavior styles
  const scrollStyles = {
    transition: 'all 0.3s ease-in-out',
    transform: trigger ? 'translateY(-100%)' : 'translateY(0)',
    boxShadow: trigger ? 'none' : '0 4px 20px 0 rgba(0, 0, 0, 0.1)',
  };

  return (
    <AppBar 
      position="fixed"
      sx={isDashboard ? dashboardStyles : scrollStyles}
    >
      {children}
    </AppBar>
  );
};

export default HideOnScroll;
