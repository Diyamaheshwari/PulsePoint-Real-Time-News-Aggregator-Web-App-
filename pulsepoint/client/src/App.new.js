import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import { useLocation } from 'react-router-dom';

// Context Providers
import { NewsProvider } from './context/NewsContext';

// Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import PrivateRoute from './components/routing/PrivateRoute';
import Alert from './components/layout/Alert';
import NewsHome from './pages/NewsHome';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';
import Home from './pages/Home';

// Context
import AuthState from './context/auth/AuthState';
import AlertState from './context/alert/AlertState';

// Utils
import setAuthToken from './utils/setAuthToken';

// Check for token in localStorage
if (localStorage.token) {
  setAuthToken(localStorage.token);
}

// Create a theme with high contrast colors for better readability
const theme = createTheme({
  palette: {
    primary: {
      main: '#1565c0',
      light: '#1976d2',
      dark: '#0d47a1',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#7b1fa2',
      light: '#9c27b0',
      dark: '#6a1b9a',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f7fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#121212',
      secondary: '#2d3748',
      disabled: '#718096',
    },
    grey: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    error: {
      main: '#b71c1c',
      light: '#ef5350',
      dark: '#c62828',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#e65100',
      light: '#ff9800',
      dark: '#ef6c00',
      contrastText: '#ffffff',
    },
    info: {
      main: '#01579b',
      light: '#0288d1',
      dark: '#01579b',
      contrastText: '#ffffff',
    },
    success: {
      main: '#1b5e20',
      light: '#2e7d32',
      dark: '#1b5e20',
      contrastText: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#1a2027',
      lineHeight: 1.2,
      letterSpacing: '-0.01562em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      color: '#1a2027',
      lineHeight: 1.2,
      marginBottom: '1rem',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      color: '#1a2027',
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: '#1a2027',
      lineHeight: 1.3,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      color: '#1a2027',
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.1rem',
      fontWeight: 600,
      color: '#1a2027',
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: '#1a2027',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      color: '#3e5060',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      letterSpacing: '0.01em',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        'html, body, #root': {
          height: '100%',
          margin: 0,
          padding: 0,
        },
        body: {
          backgroundColor: '#f5f7fa',
          color: '#121212',
          lineHeight: 1.6,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        'h1, h2, h3, h4, h5, h6': {
          marginTop: 0,
          marginBottom: '0.75rem',
          fontWeight: 700,
          lineHeight: 1.2,
          color: '#0f172a',
        },
        'p, li, span': {
          color: '#1e293b',
        },
        a: {
          color: '#1565c0',
          fontWeight: 500,
          textDecoration: 'none',
          '&:hover': {
            textDecoration: 'underline',
            color: '#0d47a1',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            borderColor: '#cbd5e1',
            '& .MuiCardMedia-root': {
              transform: 'scale(1.03)',
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #00796b 0%, #00897b 100%)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#ffffff',
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          fontWeight: 600,
          textTransform: 'none',
          padding: '8px 20px',
          boxShadow: 'none',
          letterSpacing: '0.01em',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 12px rgba(21, 101, 192, 0.3)',
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
            backgroundColor: 'rgba(21, 101, 192, 0.04)',
          },
        },
        sizeLarge: {
          padding: '10px 24px',
          fontSize: '1rem',
          lineHeight: 1.5,
        },
        text: {
          '&:hover': {
            backgroundColor: 'rgba(21, 101, 192, 0.04)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiFormLabel-root': {
            color: '#475569',
          },
          '& .MuiInputBase-input': {
            color: '#1e293b',
          },
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            '& fieldset': {
              borderColor: '#e2e8f0',
              borderWidth: '1.5px',
            },
            '&:hover fieldset': {
              borderColor: '#94a3b8',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#1565c0',
              borderWidth: '1.5px',
              boxShadow: '0 0 0 2px rgba(21, 101, 192, 0.2)',
            },
          },
        },
      },
    },
  },
});

function App() {
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);
  const isAdminPage = location.pathname.startsWith('/admin');
  const isNewsPage = location.pathname === '/news';
  
  return (
    <ThemeProvider theme={theme}>
      <AuthState>
        <AlertState>
          <NewsProvider>
            <CssBaseline />
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              {!isAuthPage && !isAdminPage && <Navbar />}
              <Alert />
              <Box 
                component="main" 
                sx={{ 
                  flexGrow: 1, 
                  pt: isAuthPage || isAdminPage ? 0 : 8,
                  px: { xs: 2, sm: 3 },
                }}
              >
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route
                    path="/"
                    element={
                      <PrivateRoute>
                        <Home />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <PrivateRoute>
                        <Dashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <PrivateRoute>
                        <Profile />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/news"
                    element={
                      <PrivateRoute>
                        <NewsHome />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/admin/*"
                    element={
                      <PrivateRoute adminOnly>
                        <AdminDashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Box>
              {!isAuthPage && !isAdminPage && <Footer />}
            </Box>
          </NewsProvider>
        </AlertState>
      </AuthState>
    </ThemeProvider>
  );
}

export default App;
