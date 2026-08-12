import axios from 'axios';
import { API_URL } from './apiConfig';

// Add a comment to an article
export const addComment = async (articleId, content) => {
  try {
    const response = await axios.post(
      `${API_URL}/news-interactions/${articleId}/comments`,
      { content },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error.response?.data || { message: 'Failed to add comment' };
  }
};

// Get comments for an article
export const getComments = async (articleId, { limit = 10, skip = 0 } = {}) => {
  try {
    const response = await axios.get(
      `${API_URL}/news-interactions/${articleId}/comments`,
      { 
        params: { limit, skip },
        withCredentials: true 
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error.response?.data || { message: 'Failed to fetch comments' };
  }
};

// Add or update a reaction to an article
export const addReaction = async (articleId, type) => {
  try {
    const response = await axios.post(
      `${API_URL}/news-interactions/${articleId}/reactions`,
      { type },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error('Error adding reaction:', error);
    throw error.response?.data || { message: 'Failed to add reaction' };
  }
};

// Get reactions for an article
export const getReactions = async (articleId) => {
  try {
    const response = await axios.get(
      `${API_URL}/news-interactions/${articleId}/reactions`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching reactions:', error);
    throw error.response?.data || { message: 'Failed to fetch reactions' };
  }
};

// Subscribe to real-time updates
export const subscribeToUpdates = (articleId, onUpdate) => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = import.meta.env.VITE_WS_URL || (import.meta.env.PROD ? `${wsProtocol}//${window.location.host}` : 'ws://localhost:5000');
  const socket = new WebSocket(wsHost);
  
  socket.onopen = () => {
    console.log('WebSocket connected');
    socket.send(JSON.stringify({ 
      type: 'subscribe', 
      channel: `article:${articleId}` 
    }));
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onUpdate(data);
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return () => {
    socket.close();
  };
};
