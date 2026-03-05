import React, { useState, useContext, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Link,
  InputAdornment,
  IconButton,
  CircularProgress,
  Avatar,
  Divider,
  Stack,
} from '@mui/material';
import { Visibility, VisibilityOff, Lock, Email, PersonAdd } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import AlertContext from '../context/alert/alertContext';
const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    showPassword: false,
  });
  const { email, password, showPassword } = formData;
  const { login, isAuthenticated, error, clearErrors } = useAuth();
  const { setAlert } = useContext(AlertContext);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  const [isLoading, setIsLoading] = useState(false);
  // Handle successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      const queryParams = new URLSearchParams(window.location.search);
      const returnUrl = queryParams.get('returnUrl') || from;
      const sessionExpired = queryParams.get('sessionExpired') === 'true';
      
      if (sessionExpired) {
        setAlert('Your session has expired. Please log in again.', 'warning');
      }
      
      console.log('Redirecting to:', returnUrl);
      navigate(returnUrl, { replace: true });
    }
  }, [isAuthenticated, from, navigate, setAlert]);
  // Handle errors
  useEffect(() => {
    if (error) {
      setAlert(error, 'error');
      clearErrors();
    }
  }, [error, clearErrors, setAlert]);
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleClickShowPassword = () => {
    setFormData({ ...formData, showPassword: !showPassword });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setAlert('', '');
    
    // Basic validation
    if (!email || !password) {
      setAlert('Please enter both email and password', 'error');
      return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAlert('Please enter a valid email address', 'error');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await login(email, password);
      
      if (result?.success) {
        // Clear any existing alerts
        setAlert('', '');
        // Navigation is handled by the useEffect that watches isAuthenticated
      } else {
        // Handle specific error cases
        const errorMessage = result?.error?.toLowerCase() || '';
        
        if (errorMessage.includes('user not found') || errorMessage.includes('no account')) {
          setAlert(
            <>
              No account found with this email. <Link component={RouterLink} to="/register" sx={{ fontWeight: 500 }}>Create an account</Link> to get started.
            </>, 
            'error'
          );
        } else if (errorMessage.includes('password') || errorMessage.includes('invalid credentials')) {
          setAlert(
            <>
              Incorrect password. <Link component={RouterLink} to="/forgot-password" sx={{ fontWeight: 500 }}>Reset your password</Link> or try again.
            </>,
            'error'
          );
        } else if (errorMessage.includes('account locked') || errorMessage.includes('too many attempts')) {
          setAlert('Account temporarily locked due to too many failed attempts. Please try again later or reset your password.', 'error');
        } else if (errorMessage.includes('email not verified')) {
          setAlert('Please verify your email address before logging in. Check your inbox for the verification link.', 'warning');
        } else {
          setAlert(
            <>
              Don't have an account? <Link component={RouterLink} to="/register" sx={{ fontWeight: 500 }}>Sign up now</Link> to get started.
            </>,
            'info'
          );
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message?.toLowerCase() || '';
      
      if (errorMessage.includes('network')) {
        setAlert('Network error. Please check your internet connection and try again.', 'error');
      } else if (errorMessage.includes('timeout')) {
        setAlert('Request timed out. Please try again.', 'error');
      } else {
        setAlert('An unexpected error occurred. Please try again later.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-fill admin credentials for demo purposes (remove in production)
  const fillAdminCredentials = () => {
    setFormData({
      email: 'admin@pulsepoint.in',
      password: 'Admin@123',
      showPassword: false
    });
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h4" sx={{ mb: 3 }}>
          Welcome to PulsePoint
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
          Please sign in to continue to your dashboard
        </Typography>
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            width: '100%',
            maxWidth: 450,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
            <Lock />
          </Avatar>
          <Typography component="h1" variant="h5">
            Sign in to PulsePoint
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              color="primary"
              sx={{ mb: 2 }}
              onClick={fillAdminCredentials}
            >
              Use Admin Account
            </Button>

            <Stack spacing={2} sx={{ width: '100%', mt: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                component={RouterLink}
                to="/register"
                startIcon={<PersonAdd />}
              >
                Create New Account
              </Button>
              <Divider sx={{ my: 2 }}>or</Divider>
              <Box sx={{ textAlign: 'center' }}>
                <Link
                  component={RouterLink}
                  to="/forgot-password"
                  variant="body2"
                  sx={{ display: 'inline-block', mt: 1 }}
                >
                  Forgot password?
                </Link>
              </Box>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;