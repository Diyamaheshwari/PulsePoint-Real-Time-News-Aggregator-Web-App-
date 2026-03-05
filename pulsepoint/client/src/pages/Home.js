import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  IconButton,
  Divider,
  Paper,
  CircularProgress,
  Tabs,
  Tab,
  Container,
  Snackbar,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  ThumbUp as ThumbUpIcon,
  ThumbUpOutlined as ThumbUpOutlinedIcon,
  Reply as ReplyIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PostAdd as PostAddIcon,
  Add as AddIcon,
  Poll as PollIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { fetchPosts, likePost, likePostAsync, addComment } from '../features/community/communitySlice';
import api from '../utils/api';
import PollForm from '../components/PollForm';
import Poll from '../components/Poll';

function TabPanel({ children, value, index, ...other }) {
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
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const Home = () => {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const dispatch = useDispatch();
  const { posts, status, error } = useSelector((state) => state.community);
  const [activeTab, setActiveTab] = useState(0);
  const [showPollForm, setShowPollForm] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [commentContent, setCommentContent] = useState('');
  const [replyingTo, setReplyingTo] = useState({ postId: null, commentId: null });
  const [editingComment, setEditingComment] = useState(null);
  const [commentAnchorEl, setCommentAnchorEl] = useState(null);
  const [selectedComment, setSelectedComment] = useState(null);
  const [polls, setPolls] = useState([]);
  const [pollsLoading, setPollsLoading] = useState(true);
  const [pollsError, setPollsError] = useState(null);

  const fetchPolls = async () => {
    try {
      setPollsLoading(true);
      const response = await api.get('/polls');
      setPolls(response.data.polls || []);
      setPollsError(null);
    } catch (err) {
      console.error('Error fetching polls:', err);
      setPollsError('Failed to load polls');
      setSnackbar({ open: true, message: 'Failed to load polls', severity: 'error' });
    } finally {
      setPollsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await dispatch(fetchPosts());
        await fetchPolls();
      } catch (err) {
        console.error('Error fetching data:', err);
        setSnackbar({ open: true, message: 'Failed to load data', severity: 'error' });
      }
    };
    fetchData();
  }, [dispatch]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setShowPollForm(false);
  };

  const handlePollCreated = (newPoll) => {
    setActiveTab(1);
    setShowPollForm(false);
    setPolls(prevPolls => [newPoll, ...prevPolls]);
    setSnackbar({ open: true, message: 'Poll created successfully!', severity: 'success' });
  };

  const handleCancelPoll = () => {
    setShowPollForm(false);
  };

  const handleLike = async (postId) => {
    try {
      // Generate a unique ID for anonymous user if not exists
      let userId = localStorage.getItem('anonymousUserId');
      if (!userId) {
        userId = `anon_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('anonymousUserId', userId);
      }
      
      // Optimistic UI update
      dispatch(likePost({ postId, userId }));
      
      // Make the actual API call with the anonymous user ID
      await dispatch(likePostAsync({ postId, userId })).unwrap();
    } catch (err) {
      console.error('Error liking post:', err);
      setSnackbar({ 
        open: true, 
        message: err.message || 'Failed to like post', 
        severity: 'error' 
      });
    }
  };

  const handlePostSubmit = async (content) => {
    if (!content.trim()) return;
    
    try {
      // Generate a unique ID for anonymous user if not exists
      let userId = user?._id;
      let isAnonymous = false;
      
      if (!userId) {
        userId = localStorage.getItem('anonymousUserId');
        if (!userId) {
          userId = `anon_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('anonymousUserId', userId);
        }
        isAnonymous = true;
      }
      
      // Make the API call to create the post with user info
      await api.post('/thoughts', { 
        content,
        user: {
          _id: userId,
          username: isAnonymous ? `Anonymous_${userId.substring(0, 6)}` : 'Anonymous',
          isAnonymous
        }
      });
      
      // Clear the input and show success message
      setCommentContent('');
      setSnackbar({ 
        open: true, 
        message: 'Post created successfully!', 
        severity: 'success' 
      });
      
      // Refresh the posts list
      dispatch(fetchPosts());
    } catch (err) {
      console.error('Error creating post:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create post';
      
      setSnackbar({ 
        open: true, 
        message: errorMessage, 
        severity: 'error' 
      });
      if (err.response?.status === 401) {
        setSnackbar({ 
          open: true, 
          message: 'Your session has expired. Please log in again.', 
          severity: 'error'
        });
        // Redirect after a short delay to show the message
        setTimeout(() => {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }, 1500);
      } else {
        setSnackbar({ 
          open: true, 
          message: errorMessage, 
          severity: 'error' 
        });
      }
    }
  };

  const handleCommentSubmit = async (postId, content, parentCommentId = null) => {
    if (!content.trim()) return;
    
    try {
      await dispatch(addComment({ 
        postId, 
        content,
        parentCommentId // Add support for nested comments
      })).unwrap();
      
      setCommentContent('');
      setReplyingTo({ postId: null, commentId: null });
    } catch (err) {
      console.error('Error adding comment:', err);
      setSnackbar({ 
        open: true, 
        message: err.message || 'Failed to add comment', 
        severity: 'error' 
      });
    }
  };

  const handleCommentMenuClick = (event, comment, postId) => {
    event.stopPropagation();
    setCommentAnchorEl(event.currentTarget);
    setSelectedComment({ ...comment, postId });
  };

  const handleCommentMenuClose = () => {
    setCommentAnchorEl(null);
    setSelectedComment(null);
  };

  const handleEditComment = () => {
    if (selectedComment) {
      setCommentContent(selectedComment.content);
      setEditingComment(selectedComment._id);
      handleCommentMenuClose();
    }
  };

  const handleDeleteComment = async () => {
    if (!selectedComment) return;
    
    try {
      await api.delete(`/thoughts/${selectedComment.postId}/comments/${selectedComment._id}`);
      setSnackbar({ open: true, message: 'Comment deleted!', severity: 'success' });
      dispatch(fetchPosts());
    } catch (err) {
      console.error('Error deleting comment:', err);
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.message || 'Failed to delete comment', 
        severity: 'error' 
      });
    } finally {
      handleCommentMenuClose();
    }
  };

  const isCommentOwner = (comment) => {
    if (!comment || !comment.user) return false;
    const currentUserId = user?._id || localStorage.getItem('anonymousUserId');
    const commentUserId = typeof comment.user === 'object' ? comment.user._id : comment.user;
    return commentUserId === currentUserId;
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="home tabs">
          <Tab icon={<PostAddIcon />} label="Posts" {...a11yProps(0)} />
          <Tab icon={<PollIcon />} label="Polls" {...a11yProps(1)} />
        </Tabs>
        {activeTab === 1 && (
          <Button 
            variant="contained" 
            startIcon={showPollForm ? <PollIcon /> : <AddIcon />}
            onClick={() => setShowPollForm(!showPollForm)}
            sx={{ borderRadius: '20px', textTransform: 'none' }}
          >
            {showPollForm ? 'Cancel' : 'Create Poll'}
          </Button>
        )}
      </Box>

      <TabPanel value={activeTab} index={0}>
        <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <Avatar 
              src={user?.avatar} 
              alt={user?.username || 'Anonymous'}
              sx={{ width: 48, height: 48, mr: 2 }}
            />
            <TextField
              fullWidth
              variant="outlined"
              placeholder="What's on your mind?"
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handlePostSubmit(commentContent);
                }
              }}
              sx={{ mr: 2 }}
            />
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => handlePostSubmit(commentContent)}
              disabled={!commentContent.trim()}
              sx={{ borderRadius: '20px', px: 3, textTransform: 'none', fontWeight: 500, mr: 1 }}
            >
              Post
            </Button>
          </Box>
        </Paper>

        {/* Poll Form */}
        {showPollForm && (
          <Box mb={3}>
            <PollForm 
              onPollCreated={handlePollCreated} 
              onCancel={() => setShowPollForm(false)} 
            />
          </Box>
        )}

        {status === 'loading' ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : status === 'failed' ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error || 'Failed to load posts. Please try again later.'}
          </Alert>
        ) : (
          <>
            {posts.map((post) => (
              <Paper key={post._id} elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                {/* Post header */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box display="flex" alignItems="center">
                    <Avatar 
                      src={post.user?.avatar} 
                      alt={post.user?.username}
                      sx={{ width: 40, height: 40, mr: 1.5 }}
                    />
                    <Box>
                      <Typography variant="subtitle2">
                        {post.user?.username || 'Anonymous'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(post.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton size="small">
                    <MoreVertIcon />
                  </IconButton>
                </Box>

                {/* Post content */}
                <Typography variant="body1" paragraph>
                  {post.content}
                </Typography>

                {/* Post actions */}
                <Box display="flex" alignItems="center" mt={2} mb={1}>
                  <Box display="flex" alignItems="center" mr={3}>
                    <IconButton 
                      size="small" 
                      onClick={() => handleLike(post._id)}
                      color={post.likes?.includes(user?._id || localStorage.getItem('anonymousUserId')) ? 'primary' : 'default'}
                    >
                      {post.likes?.includes(user?._id || localStorage.getItem('anonymousUserId')) ? (
                        <ThumbUpIcon fontSize="small" />
                      ) : (
                        <ThumbUpOutlinedIcon fontSize="small" />
                      )}
                    </IconButton>
                    <Typography variant="body2" color="textSecondary">
                      {post.likes?.length || 0}
                    </Typography>
                  </Box>
                  <Button 
                    size="small" 
                    startIcon={<ReplyIcon />}
                    onClick={() => setReplyingTo(prev => ({
                      postId: prev?.postId === post._id ? null : post._id,
                      commentId: null
                    }))}
                    sx={{ textTransform: 'none' }}
                  >
                    {replyingTo?.postId === post._id ? 'Cancel' : 'Comment'}
                  </Button>
                </Box>

                {/* Comments section */}
                {post.comments && post.comments.length > 0 && (
                  <Box mt={2} pl={2} borderLeft={2} borderColor="divider">
                    {post.comments.map((comment) => (
                      <Box key={comment._id} mb={2}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                          <Box display="flex" alignItems="center" mb={0.5}>
                            <Avatar 
                              src={comment.user?.avatar} 
                              alt={comment.user?.username}
                              sx={{ width: 24, height: 24, mr: 1 }}
                            />
                            <Typography variant="subtitle2" sx={{ fontSize: '0.8rem' }}>
                              {comment.user?.username || 'Anonymous'}
                            </Typography>
                          </Box>
                          <Box>
                            <IconButton 
                              size="small" 
                              onClick={(e) => handleCommentMenuClick(e, comment, post._id)}
                              disabled={!isCommentOwner(comment)}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                        <Typography variant="body2" sx={{ ml: 4, mb: 1 }}>
                          {comment.content}
                        </Typography>
                        <Box display="flex" alignItems="center" ml={4}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleLike(comment._id, 'comment')}
                            color={comment.likes?.includes(user?._id) ? 'primary' : 'default'}
                          >
                            {comment.likes?.includes(user?._id) ? (
                              <ThumbUpIcon fontSize="small" />
                            ) : (
                              <ThumbUpOutlinedIcon fontSize="small" />
                            )}
                          </IconButton>
                          <Typography variant="caption" color="textSecondary" mr={2}>
                            {comment.likes?.length || 0}
                          </Typography>
                          <Button 
                            size="small" 
                            onClick={() => setReplyingTo(prev => ({
                              postId: post._id,
                              commentId: prev.commentId === comment._id ? null : comment._id
                            }))}
                            sx={{ textTransform: 'none', fontSize: '0.7rem' }}
                          >
                            {replyingTo?.commentId === comment._id ? 'Cancel' : 'Reply'}
                          </Button>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Comment input - For post comments */}
                {replyingTo?.postId === post._id && !replyingTo?.commentId && (
                  <Box mt={2} pl={2}>
                    <Box display="flex" alignItems="center">
                      <Avatar 
                        src={user?.avatar} 
                        alt={user?.username || 'You'}
                        sx={{ width: 32, height: 32, mr: 1.5 }}
                      />
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        placeholder="Write a comment..."
                        value={commentContent}
                        onChange={(e) => setCommentContent(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleCommentSubmit(post._id, commentContent);
                          }
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '20px',
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                            },
                          },
                        }}
                      />
                    </Box>
                  </Box>
                )}
              </Paper>
            ))}
          </>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {showPollForm ? (
          <Box mb={3}>
            <PollForm 
              onPollCreated={handlePollCreated} 
              onCancel={() => setShowPollForm(false)} 
            />
          </Box>
        ) : pollsLoading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : pollsError ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {pollsError}
          </Alert>
        ) : polls.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No polls available
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setShowPollForm(true)}
              sx={{ mt: 2 }}
            >
              Create Your First Poll
            </Button>
          </Box>
        ) : (
          <Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setShowPollForm(true)}
              sx={{ mb: 3 }}
            >
              Create New Poll
            </Button>
            {polls.map((poll) => (
              <Poll 
                key={poll._id} 
                poll={poll} 
                onVote={(updatedPoll) => {
                  // Update the poll in the local state when a vote is cast
                  setPolls(polls.map(p => 
                    p._id === updatedPoll._id ? updatedPoll : p
                  ));
                }}
                onDelete={(pollId) => {
                  // Remove the deleted poll from the local state
                  setPolls(polls.filter(p => p._id !== pollId));
                }}
                onUpdate={(updatedPoll) => {
                  // Update the poll in the local state when edited
                  setPolls(polls.map(p => 
                    p._id === updatedPoll._id ? updatedPoll : p
                  ));
                }}
              />
            ))}
          </Box>
        )}
      </TabPanel>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Home;