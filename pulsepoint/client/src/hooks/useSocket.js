import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (eventHandlers = {}) => {
  const socketRef = useRef(null);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');
    
    // Connect to the socket server
    const socket = io(wsUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });
    
    socketRef.current = socket;

    // Attach listeners
    Object.entries(eventHandlers).forEach(([eventName, handler]) => {
      socket.on(eventName, handler);
    });

    socket.on('connect', () => {
      console.log('Real-time socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Real-time socket disconnected:', reason);
    });

    return () => {
      // Clean up event listeners and disconnect
      Object.entries(eventHandlers).forEach(([eventName]) => {
        socket.off(eventName);
      });
      socket.disconnect();
    };
  }, []);

  const emit = (eventName, data) => {
    if (socketRef.current) {
      socketRef.current.emit(eventName, data);
    }
  };

  return { socket: socketRef.current, emit };
};

export default useSocket;
