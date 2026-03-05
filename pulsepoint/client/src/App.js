// In App.js, update the imports and add the new components
import React, { Suspense } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Container } from '@mui/material';
import { ThemeProvider as MUIThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Alert from './components/layout/Alert';
import ErrorBoundary from './components/ErrorBoundary';
import CommentSection from './components/comments/CommentSection';

// Lazy load components
const ArticleDetail = React.lazy(() => import('./pages/ArticleDetail'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Home = React.lazy(() => import('./pages/Home'));
const NewsHome = React.lazy(() => import('./pages/NewsHome'));
const CommunityBuzz = React.lazy(() => import('./components/community/CommunityBuzz'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Profile = React.lazy(() => import('./pages/Profile'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const WebSocketTest = React.lazy(() => import('./__tests__/WebSocketTest'));
const CommentsPage = React.lazy(() => import('./pages/CommentsPage'));

// Layout components
const PublicLayout = ({ children }) => (
  <MUIThemeProvider theme={createTheme()}>
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
          position: 'relative',
        }}
      >
        <Alert />
        {children}
      </Box>
    </LocalizationProvider>
  </MUIThemeProvider>
);

const PrivateLayout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <MUIThemeProvider theme={createTheme()}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            backgroundColor: '#f5f5f5',
            position: 'relative',
          }}
        >
          <Navbar />
          <Alert />
          <Box component="main" sx={{ flexGrow: 1, py: 3, px: { xs: 2, sm: 3 } }}>
            <Container maxWidth="xl">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </Container>
          </Box>
          <Footer />
        </Box>
      </LocalizationProvider>
    </MUIThemeProvider>
  );
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Define public routes
  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = publicRoutes.includes(location.pathname);
  
  // Always redirect to login if not authenticated
  if (!user && !isPublicRoute) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Redirect to dashboard if authenticated and trying to access login/register
  if (user && isPublicRoute) {
    const from = location.state?.from || '/dashboard';
    return <Navigate to={from} replace />;
  }

  // Handle root path - always go to login for non-authenticated users
  if (location.pathname === '/') {
    return <Navigate to={"/login"} replace />;
  }

  return (
    <Suspense fallback={
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    }>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout><Outlet /></PublicLayout>}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>
        
        {/* Protected routes */}
        <Route element={<PrivateLayout />}>
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="news">
            <Route index element={<NewsHome />} />
            <Route path=":category" element={<NewsHome />} />
            <Route path="article/:id">
              <Route index element={<ArticleDetail />} />
              <Route path="comments" element={<CommentsPage />} />
            </Route>
          </Route>
          <Route path="community" element={<CommunityBuzz />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="admin/*" element={<AdminDashboard />} />
          
          {process.env.NODE_ENV === 'development' && (
            <Route path="ws-test" element={<WebSocketTest />} />
          )}
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

function App() {
  return <AppRoutes />;
}

export default App;