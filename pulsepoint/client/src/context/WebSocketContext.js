// d:\pulsepoint1\pulsepoint\client\src\context\WebSocketContext.js

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useRef, 
  useState, 
  useCallback,
  useMemo 
} from 'react';
import { io } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import { selectIsAuthenticated, selectCurrentUser } from '../features/auth/authSlice';
import { 
  addPost, 
  updatePost, 
  removePost, 
  addComment, 
  updateComment, 
  removeComment,
  updatePoll 
} from '../features/community/communitySlice';

// Use environment variable for WebSocket URL or fallback to development URL
const SOCKET_URL = process.env.REACT_APP_WS_URL || `ws://${window.location.hostname}:5000`;
const RECONNECTION_ATTEMPTS = 5;
const RECONNECTION_DELAY = 1000; // Start with 1 second
const MAX_RECONNECTION_DELAY = 30000; // Max 30 seconds

console.log('WebSocket URL:', SOCKET_URL);

const WebSocketContext = createContext({
  socket: null,
  isConnected: false,
  connectionError: null,
  joinPostRoom: () => console.warn('WebSocket not connected'),
  leavePostRoom: () => console.warn('WebSocket not connected')
});

export const WebSocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = useRef(null);
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);
  
  // Cleanup function to clear timeouts
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);
  
  // Handle reconnection with exponential backoff
  const handleReconnect = useCallback(() => {
    cleanup();
    
    if (reconnectAttempts >= RECONNECTION_ATTEMPTS) {
      console.log('Max reconnection attempts reached');
      setConnectionError('Unable to connect to the server. Please refresh the page to try again.');
      return;
    }
    
    const delay = Math.min(
      RECONNECTION_DELAY * Math.pow(2, reconnectAttempts),
      MAX_RECONNECTION_DELAY
    );
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${RECONNECTION_ATTEMPTS})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect();
      }
      setReconnectAttempts(prev => prev + 1);
    }, delay);
  }, [reconnectAttempts, cleanup]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!isAuthenticated) return;

    console.log('Initializing WebSocket connection...');
    
    // Clean up any existing connection
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    console.log('Creating new WebSocket connection...');
    
    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      reconnection: false, // We'll handle reconnection manually
      autoConnect: true,
      transports: ['websocket'],
      upgrade: false, // Force WebSocket only
      forceNew: true,
      auth: { token },
      query: { userId: user?._id || 'unknown' },
      withCredentials: true,
      secure: process.env.NODE_ENV === 'production',
      rejectUnauthorized: process.env.NODE_ENV === 'production',
      timeout: 10000, // 10 seconds timeout for connection
      pingTimeout: 60000, // 60 seconds without pong to consider connection dead
      pingInterval: 25000, // Send ping every 25 seconds
    });

    socketRef.current = socket;

    // Connection established
    socket.on('connect', () => {
      console.log('WebSocket connected with ID:', socket.id);
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempts(0); // Reset reconnection attempts on successful connection
      
      // Emit an auth event with the token
      socket.emit('authenticate', { token });
    });

    // Handle authentication success/failure
    socket.on('authenticated', () => {
      console.log('WebSocket authenticated successfully');
      setConnectionError(null);
    });

    socket.on('unauthorized', (error) => {
      console.error('WebSocket authentication failed:', error);
      setConnectionError('Authentication failed. Please log in again.');
      // Trigger a page refresh to handle re-authentication
      window.location.reload();
    });

    // Handle connection errors
    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
      setConnectionError('Failed to connect to WebSocket server');
      handleReconnect();
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // The server has forcefully disconnected the socket
        // This usually happens when the token is invalid or expired
        setConnectionError('Connection lost. Reconnecting...');
        handleReconnect();
      } else if (reason === 'io client disconnect') {
        // Client initiated disconnect, don't reconnect
        setConnectionError(null);
      } else {
        // Other reasons (network issues, etc.)
        setConnectionError('Connection lost. Reconnecting...');
        handleReconnect();
      }
    });

    // Event handlers for different types of updates
    socket.on('postCreated', (post) => {
      dispatch(addPost(post));
    });

    socket.on('postUpdated', (post) => {
      dispatch(updatePost(post));
    });

    socket.on('postDeleted', (postId) => {
      dispatch(removePost(postId));
    });

    socket.on('commentCreated', (comment) => {
      dispatch(addComment(comment));
    });

    socket.on('commentUpdated', (comment) => {
      dispatch(updateComment(comment));
    });

    socket.on('commentDeleted', (commentId) => {
      dispatch(removeComment(commentId));
    });

    socket.on('pollUpdated', (poll) => {
      dispatch(updatePoll(poll));
    });

    // Store the socket in the ref
    socketRef.current = socket;

    // Cleanup on unmount
    return () => {
      cleanup();
      if (socketRef.current) {
        socketRef.current.off(); // Remove all listeners
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, dispatch]);

  // Function to join a post room
  const joinPostRoom = useCallback((postId) => {
    if (socketRef.current?.connected) {
      console.log(`Joining post room: ${postId}`);
      socketRef.current.emit('joinPostRoom', { postId });
    } else {
      console.warn('Cannot join post room: WebSocket not connected');
    }
  }, []);

  // Function to leave a post room
  const leavePostRoom = useCallback((postId) => {
    if (socketRef.current?.connected) {
      console.log(`Leaving post room: ${postId}`);
      socketRef.current.emit('leavePostRoom', { postId });
    }
  }, []);

  const value = useMemo(() => ({
    socket: socketRef.current,
    isConnected,
    connectionError,
    joinPostRoom,
    leavePostRoom
  }), [isConnected, connectionError, joinPostRoom, leavePostRoom]);

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook to use the WebSocket context
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;