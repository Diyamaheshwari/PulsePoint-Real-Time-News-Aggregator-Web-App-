// API base URL configuration
export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

// WebSocket URL configuration
export const WS_URL = import.meta.env.VITE_WS_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');
