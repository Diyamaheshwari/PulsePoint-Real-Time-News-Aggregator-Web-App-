// d:\pulsepoint1\pulsepoint\client\src\components\Thoughts.js
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, 
  TextField, 
  Button, 
  CircularProgress, 
  Typography,
  Paper,
  Avatar,
  Divider
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { 
  fetchThoughts, 
  createThought,
  newThoughtReceived,
  thoughtUpdated,
  thoughtDeleted,
  likeThought
} from '../features/thoughts/thoughtsSlice';

const Thought = ({ thought, onDelete, onEdit }) => {
  const dispatch = useDispatch();
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);

  const handleLike = async () => {
    try {
      // Generate a unique ID for anonymous user
      const userId = localStorage.getItem('anonymousUserId') || 
                    `anon_${Math.random().toString(36).substr(2, 9)}`;
      
      if (!localStorage.getItem('anonymousUserId')) {
        localStorage.setItem('anonymousUserId', userId);
      }
      
      // Toggle like state
      const newLikeState = !isLiked;
      setIsLiked(newLikeState);
      
      // Dispatch like action with anonymous user ID
      await dispatch(likeThought({
        thoughtId: thought._id,
        userId
      })).unwrap();
      
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update on error
      setIsLiked(!isLiked);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
      <Box display="flex" gap={2}>
        <Avatar 
          src={thought.user?.avatar} 
          alt={thought.user?.username}
          sx={{ width: 48, height: 48 }}
        />
        <Box flex={1}>
          <Typography variant="body1" gutterBottom>
            {thought.content}
          </Typography>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Button 
              variant="text" 
              color="primary" 
              onClick={handleLike}
            >
              {isLiked ? 'Unlike' : 'Like'}
            </Button>
            <Button 
              variant="text" 
              color="primary" 
              onClick={() => onDelete(thought._id)}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

const Thoughts = () => {
  const dispatch = useDispatch();
  const { thoughts, loading, error } = useSelector((state) => state.thoughts);
  const [content, setContent] = useState('');

  useEffect(() => {
    dispatch(fetchThoughts());
    
    // Set up WebSocket listeners
    const socket = window.socket;
    
    const handleNewThought = (thought) => {
      dispatch(newThoughtReceived(thought));
    };
    
    const handleThoughtUpdated = (thought) => {
      dispatch(thoughtUpdated(thought));
    };
    
    const handleThoughtDeleted = (data) => {
      dispatch(thoughtDeleted(data));
    };
    
    socket.on('newThought', handleNewThought);
    socket.on('updateThought', handleThoughtUpdated);
    socket.on('deleteThought', handleThoughtDeleted);
    
    return () => {
      socket.off('newThought', handleNewThought);
      socket.off('updateThought', handleThoughtUpdated);
      socket.off('deleteThought', handleThoughtDeleted);
    };
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    try {
      await dispatch(createThought(content)).unwrap();
      setContent('');
    } catch (error) {
      console.error('Error creating thought:', error);
    }
  };

  if (loading && thoughts.length === 0) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" sx={{ my: 2 }}>
        {error}
      </Typography>
    );
  }

  return (
    <Box>
      {/* Create Thought Form */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box display="flex" gap={2}>
          <Avatar 
            src={user?.avatar} 
            alt={user?.username}
            sx={{ width: 48, height: 48 }}
          />
          <Box flex={1}>
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                placeholder="Share your thoughts..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Box display="flex" justifyContent="flex-end">
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={!content.trim() || loading}
                >
                  {loading ? 'Posting...' : 'Post'}
                </Button>
              </Box>
            </form>
          </Box>
        </Box>
      </Paper>

      {/* Thoughts List */}
      {thoughts.length === 0 ? (
        <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No thoughts yet
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Be the first to share your thoughts!
          </Typography>
        </Paper>
      ) : (
        thoughts.map((thought) => (
          <Thought 
            key={thought._id} 
            thought={thought} 
            onDelete={(id) => console.log('Delete thought:', id)}
            onEdit={(thought) => console.log('Edit thought:', thought)}
          />
        ))
      )}
    </Box>
  );
};

export default Thoughts;