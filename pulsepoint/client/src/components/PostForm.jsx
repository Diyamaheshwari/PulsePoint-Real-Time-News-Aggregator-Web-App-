import React, { useState, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createNewPost, addPost } from '../features/community/communitySlice';
import AlertContext from '../context/alert/alertContext';
import { 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Avatar, 
  CircularProgress,
  Typography,
  Divider
} from '@mui/material';
import { Send as SendIcon, Login as LoginIcon } from '@mui/icons-material';

const PostForm = () => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  const { setAlert } = useContext(AlertContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setAlert('Please enter some content for your post', 'error');
      return;
    }
    
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      setAlert('Please log in to create a post', 'error');
      return;
    }
    
    try {
      setIsSubmitting(true);
      // Clear any previous errors
      setAlert('', '');
      
      // Create the post data with required fields
      const postData = {
        content: content.trim(),
        // The backend will add user info from the token
      };
      
      console.log('Submitting post with data:', postData);
      
      const result = await dispatch(createNewPost(postData)).unwrap();
      console.log('Post created successfully:', result);
      
      // Reset form
      setContent('');
      setAlert('Post created successfully!', 'success');
      
      // Manually add the post to the state if needed
      if (result.data) {
        dispatch(addPost(result.data));
      }
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      
      let errorMessage = 'Failed to create post. ';
      if (err.message) {
        errorMessage += err.message;
      } else if (typeof err === 'string') {
        errorMessage += err;
      } else {
        errorMessage += 'Please try again later.';
      }
      
      setAlert(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show login prompt if user is not logged in
  if (!user) {
    return (
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Join the conversation
        </Typography>
        <Typography color="text.secondary" paragraph>
          Log in to share your thoughts and connect with others.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<LoginIcon />}
          onClick={() => navigate('/login')}
        >
          Log in to post
        </Button>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
      <Box display="flex" gap={2}>
        <Avatar 
          src={user?.avatar} 
          alt={user?.username}
          sx={{ width: 48, height: 48 }}
        />
        <Box flex={1}>
          <Typography variant="subtitle2" color="text.secondary" mb={1}>
            Share your thoughts...
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              sx={{ mb: 2 }}
              disabled={isSubmitting}
            />
            <Box display="flex" justifyContent="flex-end">
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!content.trim() || isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : <SendIcon />}
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </Button>
            </Box>
          </form>
        </Box>
      </Box>
    </Paper>
  );
};

export default PostForm;