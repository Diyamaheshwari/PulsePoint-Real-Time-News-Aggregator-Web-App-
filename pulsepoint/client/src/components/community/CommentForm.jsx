import React, { useState } from 'react';
import { useAuth } from '../../hooks';
import { Button, TextField, Box, Paper, Typography } from '@mui/material';
import api from '../../utils/api';

const CommentForm = ({ postId, onCommentAdded }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    // Get the token from localStorage
    const token = localStorage.getItem('token');
    
    // If no token, redirect to login
    if (!token) {
      window.location.href = '/login';
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Use the API utility which handles auth headers automatically
      const response = await api.post(`/community/posts/${postId}/comments`, { content });
      
      // If we get here, the comment was added successfully
      onCommentAdded(response.data);
      setContent('');
    } catch (err) {
      console.error('Error adding comment:', err);
      
      // Handle different error cases
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const errorMessage = err.response.data?.message || 'Failed to add comment';
        setError(errorMessage);
        
        // If token is invalid or expired, redirect to login
        if (err.response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      } else if (err.request) {
        // The request was made but no response was received
        setError('No response from server. Please try again.');
      } else {
        // Something happened in setting up the request
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 2, ml: 2, pl: 2, borderLeft: 1, borderColor: 'divider' }}>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          multiline
          rows={2}
          variant="outlined"
          placeholder="Write a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={loading}
          sx={{ mb: 1 }}
        />
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}
        <Box display="flex" justifyContent="flex-end">
          <Button 
            type="submit" 
            variant="contained" 
            size="small"
            disabled={!content.trim() || loading}
          >
            {loading ? 'Posting...' : 'Comment'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default CommentForm;
