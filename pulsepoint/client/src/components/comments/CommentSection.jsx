import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  IconButton, 
  CircularProgress,
  Paper,
  Divider
} from '@mui/material';
import { Send as SendIcon, Edit as EditIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import webSocketService from '../../services/websocketService';

const CommentSection = () => {
  const { articleId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load comments for the article
  useEffect(() => {
    const loadComments = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        // TODO: Replace with actual API call
        // const response = await api.get(`/api/articles/${articleId}/comments`);
        // setComments(response.data);
        setComments([]);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading comments:', error);
        setIsLoading(false);
      }
    };

    if (articleId) {
      loadComments();
      webSocketService.subscribeToArticle(articleId);
    }

    return () => {
      if (articleId) {
        webSocketService.unsubscribeFromArticle(articleId);
      }
    };
  }, [articleId]);

  // Set up WebSocket listeners
  useEffect(() => {
    if (!articleId) return;

    const handleNewComment = (data) => {
      if (data.articleId === articleId) {
        setComments(prev => {
          if (!prev.some(comment => comment.id === data.comment.id)) {
            return [...prev, data.comment];
          }
          return prev;
        });
      }
    };

    const handleCommentUpdated = (data) => {
      if (data.articleId === articleId) {
        setComments(prev =>
          prev.map(comment =>
            comment.id === data.comment.id
              ? { ...comment, content: data.comment.content }
              : comment
          )
        );
      }
    };

    const handleCommentDeleted = (data) => {
      if (data.articleId === articleId) {
        setComments(prev => prev.filter(comment => comment.id !== data.commentId));
      }
    };

    const unsubscribeNewComment = webSocketService.onNewComment(articleId, handleNewComment);
    const unsubscribeCommentUpdated = webSocketService.onCommentUpdated(articleId, handleCommentUpdated);
    const unsubscribeCommentDeleted = webSocketService.onCommentDeleted(articleId, handleCommentDeleted);

    return () => {
      if (unsubscribeNewComment) unsubscribeNewComment();
      if (unsubscribeCommentUpdated) unsubscribeCommentUpdated();
      if (unsubscribeCommentDeleted) unsubscribeCommentDeleted();
    };
  }, [articleId]);

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    const comment = {
      id: Date.now().toString(),
      content: newComment,
      userId: user.id,
      username: user.username || 'Anonymous',
      timestamp: new Date().toISOString()
    };

    setComments(prev => [...prev, comment]);
    setNewComment('');
    webSocketService.sendComment(articleId, newComment, user.id);
  };

  const handleUpdateComment = (e) => {
    e.preventDefault();
    if (!editingText.trim() || !editingCommentId) return;

    setComments(prev => 
      prev.map(comment => 
        comment.id === editingCommentId
          ? { ...comment, content: editingText }
          : comment
      )
    );

    webSocketService.sendCommentUpdate(articleId, editingCommentId, editingText);
    setEditingCommentId(null);
    setEditingText('');
  };

  const handleDeleteComment = (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    setComments(prev => prev.filter(comment => comment.id !== commentId));
    webSocketService.sendCommentDelete(articleId, commentId);
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return '';
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Back to News
      </Button>
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {state?.article?.title || 'Comments'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {state?.article?.description || 'Share your thoughts about this article'}
        </Typography>
      </Paper>
      
      {user ? (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <form onSubmit={editingCommentId ? handleUpdateComment : handleAddComment}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder={editingCommentId ? 'Edit your comment...' : 'Add a comment...'}
              value={editingCommentId ? editingText : newComment}
              onChange={(e) => 
                editingCommentId 
                  ? setEditingText(e.target.value) 
                  : setNewComment(e.target.value)
              }
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <Box display="flex" justifyContent="flex-end" gap={2}>
              {editingCommentId && (
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    setEditingCommentId(null);
                    setEditingText('');
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                variant="contained" 
                startIcon={<SendIcon />}
                disabled={editingCommentId ? !editingText.trim() : !newComment.trim()}
              >
                {editingCommentId ? 'Update' : 'Post Comment'}
              </Button>
            </Box>
          </form>
        </Paper>
      ) : (
        <Paper elevation={2} sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <Typography variant="body1" gutterBottom>
            Please log in to leave a comment.
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => navigate('/login', { state: { from: window.location.pathname } })}
          >
            Log In
          </Button>
        </Paper>
      )}

      <Paper elevation={2}>
        <List>
          {comments.length === 0 ? (
            <ListItem>
              <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', width: '100%', py: 3 }}>
                No comments yet. Be the first to comment!
              </Typography>
            </ListItem>
          ) : (
            comments.map((comment, index) => (
              <React.Fragment key={comment.id}>
                <ListItem 
                  alignItems="flex-start"
                  secondaryAction={
                    comment.userId === user?.id && (
                      <Box>
                        <IconButton 
                          edge="end" 
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditingText(comment.content);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          size="small"
                          sx={{ ml: 1 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          onClick={() => handleDeleteComment(comment.id)}
                          size="small"
                          sx={{ ml: 1 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )
                  }
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" mb={0.5}>
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            fontWeight: 'bold',
                            color: comment.userId === user?.id ? 'primary.main' : 'text.primary'
                          }}
                        >
                          {comment.username}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ ml: 1 }}
                        >
                          {formatDate(comment.timestamp)}
                        </Typography>
                        {comment.userId === user?.id && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              ml: 1,
                              px: 1,
                              py: 0.5,
                              bgcolor: 'primary.light',
                              color: 'primary.contrastText',
                              borderRadius: 1,
                              fontSize: '0.6rem',
                              fontWeight: 'bold'
                            }}
                          >
                            YOU
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        color="text.primary"
                        sx={{ 
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-line'
                        }}
                      >
                        {comment.content}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < comments.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default CommentSection;
