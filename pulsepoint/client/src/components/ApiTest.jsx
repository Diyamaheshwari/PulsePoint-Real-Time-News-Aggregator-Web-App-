import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPosts, createNewPost } from '../features/community/communitySlice';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  TextField, 
  List, 
  ListItem, 
  ListItemText,
  Divider,
  CircularProgress
} from '@mui/material';

const ApiTest = () => {
  const [testResult, setTestResult] = useState(null);
  const [postContent, setPostContent] = useState('Test post from API tester');
  const dispatch = useDispatch();
  const { posts, status, error } = useSelector((state) => state.community);

  const runTests = async () => {
    try {
      setTestResult({ status: 'running', message: 'Running tests...' });
      
      // Test 1: Fetch posts
      const postsResult = await dispatch(fetchPosts()).unwrap();
      console.log('Posts fetched:', postsResult);
      
      setTestResult({
        status: 'success',
        message: `API connection successful. Found ${posts?.length || 0} posts.`,
        posts: postsResult
      });
    } catch (error) {
      console.error('API Test Error:', error);
      setTestResult({
        status: 'error',
        message: error.message || 'Failed to connect to API',
        error: error.response?.data || error
      });
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim()) return;
    
    try {
      setTestResult({ status: 'running', message: 'Creating post...' });
      const result = await dispatch(createNewPost({ content: postContent })).unwrap();
      
      setTestResult({
        status: 'success',
        message: 'Post created successfully!',
        post: result
      });
      
      // Refresh the posts list
      await dispatch(fetchPosts());
    } catch (error) {
      console.error('Create Post Error:', error);
      setTestResult({
        status: 'error',
        message: error.message || 'Failed to create post',
        error: error.response?.data || error
      });
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>API Connection Test</Typography>
      
      <Box sx={{ mb: 3 }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={runTests}
          disabled={status === 'loading'}
          sx={{ mr: 2 }}
        >
          {status === 'loading' ? <CircularProgress size={24} /> : 'Test API Connection'}
        </Button>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>Create Test Post</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
          />
          <Button 
            variant="outlined" 
            onClick={handleCreatePost}
            disabled={!postContent.trim() || status === 'loading'}
          >
            Create Post
          </Button>
        </Box>
      </Box>
      
      {testResult && (
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            bgcolor: testResult.status === 'error' ? 'error.light' : 
                    testResult.status === 'success' ? 'success.light' : 'info.light'
          }}
        >
          <Typography variant="subtitle1">
            Status: {testResult.status.toUpperCase()}
          </Typography>
          <Typography>{testResult.message}</Typography>
          
          {testResult.error && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2">Error Details:</Typography>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(testResult.error, null, 2)}
              </pre>
            </Box>
          )}
        </Paper>
      )}
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>Current Posts ({posts?.length || 0})</Typography>
        {status === 'loading' ? (
          <CircularProgress />
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <List>
            {posts?.map((post) => (
              <React.Fragment key={post._id}>
                <ListItem alignItems="flex-start">
                  <ListItemText
                    primary={post.content}
                    secondary={`By: ${post.username} - ${new Date(post.createdAt).toLocaleString()}`}
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
            {(!posts || posts.length === 0) && (
              <ListItem>
                <ListItemText primary="No posts found" />
              </ListItem>
            )}
          </List>
        )}
      </Box>
    </Paper>
  );
};

export default ApiTest;
