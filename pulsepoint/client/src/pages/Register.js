import React, { useState, useContext, useEffect } from 'react';
import { Link as RouterLink, Link as MuiLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Link,
  InputAdornment,
  IconButton,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Avatar,
} from '@mui/material';
import {
  Person,
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  ArrowBack,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import AlertContext from '../context/alert/alertContext';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    showPassword: false,
    showConfirmPassword: false,
    acceptTerms: false,
  });

  const {
    username,
    email,
    password,
    confirmPassword,
    showPassword,
    showConfirmPassword,
    acceptTerms,
  } = formData;

  const { register, isAuthenticated, error, clearErrors } = useAuth();
  const { setAlert } = useContext(AlertContext);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }

    if (error) {
      setAlert(error, 'error');
      clearErrors();
    }
    // eslint-disable-next-line
  }, [isAuthenticated, error, from, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckboxChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.checked });
  };

  const handleClickShowPassword = (field) => {
    setFormData({ ...formData, [field]: !formData[field] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setAlert('Passwords do not match', 'error');
      return;
    }

    if (!acceptTerms) {
      setAlert('You must accept the terms and conditions', 'error');
      return;
    }

    setLoading(true);
    
    try {
      await register({ username, email, password });
      setAlert('Registration successful! Please log in.', 'success');
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container 
      component="main" 
      maxWidth="sm"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        py: 4
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <Box textAlign="center" mb={4}>
          <Typography component="h1" variant="h4" sx={{ mb: 1.5, fontWeight: 600 }}>
            Create your PulsePoint account
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Join our community to get started
          </Typography>
        </Box>
        
        <Paper
          elevation={3}
          sx={{
            padding: { xs: 3, sm: 4 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            borderRadius: 2,
            maxWidth: 600,
          }}
        >
          <Avatar 
            sx={{ 
              m: 1, 
              bgcolor: 'primary.main', 
              width: 56, 
              height: 56,
              mb: 2
            }}
          >
            <Person fontSize="large" />
          </Avatar>
          
          <Typography component="h2" variant="h6" color="text.primary" textAlign="center" mb={3}>
            Get started with your free account
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField
                  autoComplete="username"
                  name="username"
                  required
                  fullWidth
                  id="username"
                  label="Username"
                  autoFocus
                  value={username}
                  onChange={handleChange}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={handleChange}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={handleChange}
                  variant="outlined"
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
                          onClick={() => handleClickShowPassword('showPassword')}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={handleChange}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle confirm password visibility"
                          onClick={() => handleClickShowPassword('showConfirmPassword')}
                          edge="end"
                          size="small"
                        >
                          {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="acceptTerms"
                      color="primary"
                      checked={acceptTerms}
                      onChange={handleCheckboxChange}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      I agree to the{' '}
                      <MuiLink href="#" color="primary" underline="hover">
                        Terms and Conditions
                      </MuiLink>
                    </Typography>
                  }
                  sx={{ mt: -1, mb: 1 }}
                />
              </Grid>
            </Grid>
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{
                mt: 2,
                mb: 2,
                py: 1.5,
                fontWeight: 500,
                textTransform: 'none',
                fontSize: '1rem',
                borderRadius: 1,
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }
              }}
              disabled={loading || !acceptTerms}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Create Account'
              )}
            </Button>

            <Box sx={{ textAlign: 'center', width: '100%', mt: 3 }}>
              <Button
                component={RouterLink}
                to="/login"
                color="primary"
                variant="text"
                startIcon={<ArrowBack />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    backgroundColor: 'transparent',
                    textDecoration: 'underline',
                  }
                }}
              >
                Already have an account? Sign in
              </Button>
              
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  mt: 3,
                  fontSize: '0.75rem',
                  lineHeight: 1.6,
                  maxWidth: '80%',
                  mx: 'auto',
                  color: 'text.secondary'
                }}
              >
                By creating an account, you agree to our{' '}
                <Link href="#" variant="body2" underline="hover">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="#" variant="body2" underline="hover">
                  Privacy Policy
                </Link>
                .
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
