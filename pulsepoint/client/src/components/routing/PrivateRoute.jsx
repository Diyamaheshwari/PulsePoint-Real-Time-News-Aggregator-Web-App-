import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CircularProgress, Box } from '@mui/material';
import { selectCurrentUser, selectIsAuthenticated, selectAuthStatus } from '../../features/auth/authSlice';

const PrivateRoute = ({ children, adminOnly = false }) => {
    const isAuthenticated = useSelector(selectIsAuthenticated);
  const status = useSelector(selectAuthStatus);
  const loading = status === 'loading';
  const user = useSelector(selectCurrentUser);
  const location = useLocation();

  // If still loading, show a loading spinner
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If adminOnly is true and user is not an admin, redirect to dashboard
  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // If authenticated and authorized, render the children
  return children;
};

export default PrivateRoute;
