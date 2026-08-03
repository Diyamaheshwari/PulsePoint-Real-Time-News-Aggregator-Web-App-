import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/apiService';
import io from 'socket.io-client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketAuthenticated, setSocketAuthenticated] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const socketRef = useRef(null);
  const navigate = useNavigate();

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (!token) {
          setLoading(false);
          return;
        }

        // Set auth header
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // If we have a stored user, use it temporarily
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
          } catch (e) {
            console.error('Failed to parse stored user:', e);
          }
        }

        // Verify the token with the server
        try {
          const response = await api.get('/auth/me');
          const userData = response.data.user || response.data;
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          setIsAuthenticated(true);
          initWebSocket(token);
        } catch (err) {
          console.error('Token validation failed:', err);
          logout('Your session has expired. Please log in again.');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Logout function with cleanup
  const logout = useCallback((message = 'You have been logged out.') => {
    setIsAuthenticated(false);
    // Clear all auth related data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('auth_token');
    
    // Reset all auth state
    setUser(null);
    setLoading(false);
    setError(null);
    
    // Clean up WebSocket
    setSocketConnected(false);
    setSocketAuthenticated(false);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSocket(null);
    
    // Remove auth header
    delete api.defaults.headers.common['Authorization'];
    
    // Show logout message if provided
    if (message) {
      toast.info(message);
    }
    
    // Redirect to login
    navigate('/login', { 
      replace: true,
      state: { from: window.location.pathname }
    });
  }, [navigate]);

  // Initialize WebSocket connection
  const initWebSocket = useCallback((token) => {
    if (!token) {
      console.log('No token available for WebSocket connection');
      return null;
    }
    
    // If we already have a connected socket with the same token, return it
    if (socketRef.current?.connected && socketRef.current?.auth?.token === token) {
      console.log('Using existing WebSocket connection');
      return socketRef.current;
    }

    // If we already have a socket and it's connected, return it
    if (socketRef.current?.connected) {
      console.log('WebSocket already connected, reusing existing connection');
      return socketRef.current;
    }

    // Close existing socket if it exists
    if (socketRef.current) {
      console.log('Closing existing WebSocket connection');
      socketRef.current.off(); // Remove all event listeners
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    // Prevent multiple connection attempts
    if (socketRef.current?.connecting) {
      console.log('WebSocket connection already in progress');
      return null;
    }

    console.log('Initializing new WebSocket connection with token:', token.substring(0, 10) + '...');
    
    try {
      const wsTarget = import.meta.env.VITE_WS_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');
      const newSocket = io(wsTarget, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: false, // We'll handle reconnection manually
        timeout: 10000,
        auth: { token },
        withCredentials: true,
        autoConnect: true,
        forceNew: true,
        secure: process.env.NODE_ENV === 'production',
        rejectUnauthorized: false
      });

      let reconnectAttempts = 0;
      const maxReconnectAttempts = 5;
      let reconnectTimeout = null;

      const setupReconnection = () => {
        if (reconnectAttempts >= maxReconnectAttempts) {
          console.log('Max reconnection attempts reached');
          return;
        }

        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff, max 30s
        console.log(`Will attempt to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
        
        reconnectTimeout = setTimeout(() => {
          if (user && !newSocket.connected) {
            reconnectAttempts++;
            newSocket.connect();
          }
        }, delay);
      };

      // Set up event handlers
      const onConnect = () => {
        console.log('WebSocket connected with ID:', newSocket.id);
        setSocketConnected(true);
        reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        
        // Clear any pending reconnection timeout
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
      };

      const onAuthenticated = (data) => {
        console.log('WebSocket authenticated successfully', data);
        setSocketAuthenticated(true);
        
        // Join user's personal room if user ID is available
        if (user?._id) {
          newSocket.emit('join', { userId: user._id });
        }
      };

      const onDisconnect = (reason) => {
        console.log('WebSocket disconnected. Reason:', reason);
        setSocketConnected(false);
        setSocketAuthenticated(false);
        
        // Only attempt to reconnect if user is still logged in and not already reconnecting
        if (user && !reconnectTimeout) {
          setupReconnection();
        }
      };

      const onConnectError = (error) => {
        console.error('WebSocket connection error:', error.message);
        setSocketConnected(false);
        setSocketAuthenticated(false);
        
        // For auth errors, clear the token and redirect to login
        if (error.message.includes('401') || error.message.includes('403')) {
          console.log('Authentication error, logging out...');
          logout();
        } else if (user) {
          setupReconnection();
        }
      };

      // Set up event listeners
      newSocket.on('connect', onConnect);
      newSocket.on('authenticated', onAuthenticated);
      newSocket.on('disconnect', onDisconnect);
      newSocket.on('connect_error', onConnectError);
      newSocket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      // Cleanup function
      const cleanup = () => {
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        newSocket.off('connect', onConnect);
        newSocket.off('authenticated', onAuthenticated);
        newSocket.off('disconnect', onDisconnect);
        newSocket.off('connect_error', onConnectError);
      };

      // Store the socket reference and cleanup function
      socketRef.current = newSocket;
      socketRef.current.cleanup = cleanup;
      setSocket(newSocket);
      
      return newSocket;
      
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      return null;
    }
  }, [user, logout]);

  // Clean up WebSocket connection
  const cleanupWebSocket = useCallback(() => {
    if (socketRef.current) {
      console.log('Cleaning up WebSocket connection');
      if (socketRef.current.cleanup) {
        socketRef.current.cleanup();
      }
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setSocketConnected(false);
      setSocketAuthenticated(false);
    }
  }, []);

  // Login function with enhanced error handling and rate limiting support
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      // Store token and user in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Set user state and authentication status
      setUser(user);
      setIsAuthenticated(true);
      
      // Initialize WebSocket connection
      initWebSocket(token);
      
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
      setIsAuthenticated(false);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Register function with validation
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/auth/register', userData);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      setUser(user);
      
      // Initialize WebSocket after successful registration
      initWebSocket(token);
      
      toast.success('Registration successful! Welcome to PulsePoint!');
      navigate('/onboarding'); // Navigate to onboarding after successful registration
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      return { 
        success: false, 
        message: errorMessage,
        errors: error.response?.data?.errors
      };
    } finally {
      setLoading(false);
    }
  };

  // Update profile function
  const updateProfile = async (userData) => {
    try {
      const response = await api.put('/auth/profile', userData);
      setUser(prev => ({
        ...prev,
        ...response.data.user
      }));
      toast.success('Profile updated successfully!');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update profile.';
      setError(errorMessage);
      toast.error(errorMessage);
      return { 
        success: false, 
        message: errorMessage,
        errors: error.response?.data?.errors
      };
    }
  };

  // Refresh token function
  const refreshToken = async () => {
    try {
      const response = await api.post('/auth/refresh-token');
      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      setUser(userData);
      
      return { success: true, token };
    } catch (error) {
      console.error('Failed to refresh token:', error);
      logout();
      return { success: false };
    }
  };

  // Clear errors
  const clearErrors = () => setError(null);

  // Context value
  const value = {
    user,
    loading,
    error,
    socket,
    socketConnected,
    socketAuthenticated,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    updateProfile,
    refreshToken,
    initWebSocket,
    clearErrors
  };

  return (
  <AuthContext.Provider value={value}>
    {children}
  </AuthContext.Provider>
);
};

// Custom hook to use auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext, useAuth };
export default AuthContext;