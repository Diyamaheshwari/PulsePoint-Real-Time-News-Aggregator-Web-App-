import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks';

// Layout components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages (Direct & Lazy)
import Home from './pages/Home';
import Onboarding from './pages/Onboarding';
import CommentsPage from './pages/CommentsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Communities from './pages/Communities';
import CommunityView from './pages/CommunityView';
import ArticleView from './pages/ArticleView';

import Landing from './pages/Landing';

// Standard PrivateRoute Guard
const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-surface flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-t-brand-primary border-r-transparent border-gray-200 rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in -> Login page
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Admin / Moderator check
  if (adminOnly && !['admin', 'moderator'].includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Onboarding guard: Force un-onboarded users to complete Onboarding
  if (user && !user.onboardingCompleted && location.pathname !== '/onboarding' && !['admin', 'moderator'].includes(user.role)) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  // Pages that don't display global Navbar or Footer (auth / onboarding wizard)
  const isMinimalLayout = ['/login', '/register', '/onboarding'].includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-brand-surface text-text-primary font-sans">
      
      {/* Global Navigation Header */}
      {!isMinimalLayout && <Navbar />}

      {/* Main Page Content Body */}
      <main className={`flex-grow flex flex-col ${!isMinimalLayout ? 'pt-11' : ''}`}>
        <Suspense fallback={
          <div className="min-h-screen bg-brand-surface flex justify-center items-center">
            <div className="w-10 h-10 border-4 border-t-brand-primary border-r-transparent border-gray-200 rounded-full animate-spin" />
          </div>
        }>
          <Routes>
            {/* Public Auth Routes */}
            <Route 
              path="/login" 
              element={user ? <Navigate to="/" replace /> : <Login />} 
            />
            <Route 
              path="/register" 
              element={user ? <Navigate to="/" replace /> : <Register />} 
            />

            {/* Protected Onboarding Wizard */}
            <Route
              path="/onboarding"
              element={
                <PrivateRoute>
                  {user?.onboardingCompleted ? <Navigate to="/" replace /> : <Onboarding />}
                </PrivateRoute>
              }
            />

            {/* Root Route (Landing or Feed) */}
            <Route
              path="/"
              element={
                user ? <Home /> : <Landing />
              }
            />
            
            <Route
              path="/home"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />

            <Route
              path="/communities"
              element={
                <Communities />
              }
            />

            <Route
              path="/community/:id"
              element={
                <CommunityView />
              }
            />

            {/* Profile Settings Route */}
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />

            {/* Public Profile Route */}
            <Route
              path="/user/:id"
              element={
                <PublicProfile />
              }
            />

            {/* In-App Article Reading */}
            <Route
              path="/news/article/:id"
              element={
                <ArticleView />
              }
            />

            {/* Threaded Comments Route */}
            <Route
              path="/news/article/:id/comments"
              element={
                <PrivateRoute>
                  <CommentsPage />
                </PrivateRoute>
              }
            />

            {/* Admin Moderator Control Dashboard */}
            <Route
              path="/admin"
              element={
                <PrivateRoute adminOnly>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />

            {/* Fallback Catch-All */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* Global Minimal Footer */}
      {!isMinimalLayout && <Footer />}
    </div>
  );
}