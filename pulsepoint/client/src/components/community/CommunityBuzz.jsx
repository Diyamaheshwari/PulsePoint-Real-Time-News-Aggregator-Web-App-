import React, { useState, useEffect } from 'react';
import { Box, Container, Tabs, Tab, Typography } from '@mui/material';
import { useWebSocket } from '../../context/WebSocketContext';
import Post from './Post';
import PostForm from './PostForm';
import Poll from './Poll';
import PollForm from './PollForm';
import { usePosts, usePolls } from '../../hooks';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography component="div">{children}</Typography>
        </Box>
      )}
    </div>
  );
};

const CommunityBuzz = () => {
  const [tabValue, setTabValue] = useState(0);
  const socket = useWebSocket();
  const { posts, loading: postsLoading, error: postsError, createPost, likePost } = usePosts();
  const { polls, loading: pollsLoading, error: pollsError, createPoll, voteInPoll } = usePolls();

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    if (socket) {
      // Listen for new posts and polls
      socket.on('newPost', (post) => {
        // Handle new post
        console.log('New post received:', post);
      });

      socket.on('newComment', (comment) => {
        // Handle new comment
        console.log('New comment received:', comment);
      });

      socket.on('pollUpdate', (poll) => {
        // Handle poll updates
        console.log('Poll updated:', poll);
      });

      return () => {
        // Clean up event listeners
        socket.off('newPost');
        socket.off('newComment');
        socket.off('pollUpdate');
      };
    }
  }, [socket]);

  const handleCreatePost = async (postData) => {
    try {
      await createPost(postData);
      // The usePosts hook will handle updating the local state
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleCreatePoll = async (pollData) => {
    try {
      await createPoll(pollData);
      // The usePolls hook will handle updating the local state
    } catch (error) {
      console.error('Error creating poll:', error);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ width: '100%', bgcolor: 'background.paper', mt: 4 }}>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab label="Posts" />
          <Tab label="Polls" />
          <Tab label="Create Post" />
          <Tab label="Create Poll" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {postsLoading ? (
            <Typography>Loading posts...</Typography>
          ) : postsError ? (
            <Typography color="error">Error loading posts: {postsError.message}</Typography>
          ) : (
            posts.map((post) => (
              <Post key={post._id} post={post} onLike={likePost} />
            ))
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {pollsLoading ? (
            <Typography>Loading polls...</Typography>
          ) : pollsError ? (
            <Typography color="error">Error loading polls: {pollsError.message}</Typography>
          ) : (
            polls.map((poll) => (
              <Poll key={poll._id} poll={poll} onVote={voteInPoll} />
            ))
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <PostForm onSubmit={handleCreatePost} />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <PollForm onSubmit={handleCreatePoll} />
        </TabPanel>
      </Box>
    </Container>
  );
};

export default CommunityBuzz;
