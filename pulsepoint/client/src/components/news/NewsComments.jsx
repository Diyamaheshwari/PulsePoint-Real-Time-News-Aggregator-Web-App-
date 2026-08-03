import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Avatar, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Divider,
  IconButton,
  CircularProgress
} from '@mui/material';
import { Send as SendIcon, Person as PersonIcon } from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { addComment, getComments, subscribeToUpdates } from '../../services/newsInteractionService';

const NewsComments = ({ articleId, currentUser }) => {
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const commentsEndRef = useRef(null);
  const limit = 5;

  // Load initial comments
  useEffect(() => {
    const loadComments = async () => {
      try {
        setLoading(true);
        const data = await getComments(articleId, { limit });
        setComments(data.comments || []);
        setHasMore(data.hasMore);
      } catch (error) {
        console.error('Failed to load comments:', error);
      } finally {
        setLoading(false);
      }
    };

    loadComments();
  }, [articleId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!articleId) return;
    
    const unsubscribe = subscribeToUpdates(articleId, (data) => {
      if (data.type === 'newComment') {
        setComments(prev => [data.comment, ...prev]);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [articleId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    try {
      const newComment = await addComment(articleId, comment.trim());
      setComment('');
      // The comment will be added via the WebSocket update
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  };

  const loadMoreComments = async () => {
    if (loadingMore || !hasMore) return;
    
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const data = await getComments(articleId, { 
        limit, 
        skip: page * limit 
      });
      
      setComments(prev => [...prev, ...(data.comments || [])]);
      setHasMore(data.hasMore);
      setPage(nextPage);
    } catch (error) {
      console.error('Failed to load more comments:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Comments ({comments.length})
      </Typography>
      
      {/* Comment form */}
      {currentUser && (
        <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
          <Box display="flex" gap={1}>
            <Avatar 
              src={currentUser.avatar} 
              alt={currentUser.username}
              sx={{ width: 40, height: 40, mt: 1 }}
            >
              {!currentUser.avatar && <PersonIcon />}
            </Avatar>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Write a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              multiline
              maxRows={4}
              size="small"
              sx={{ flex: 1 }}
            />
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={!comment.trim()}
              sx={{ alignSelf: 'flex-end', minWidth: 100 }}
              endIcon={<SendIcon />}
            >
              Post
            </Button>
          </Box>
        </Box>
      )}
      
      {/* Comments list */}
      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {comments.length === 0 ? (
          <Typography variant="body2" color="textSecondary" align="center" py={2}>
            No comments yet. Be the first to comment!
          </Typography>
        ) : (
          comments.map((item, index) => (
            <React.Fragment key={item._id || index}>
              <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar 
                    src={item.userId?.avatar} 
                    alt={item.userId?.username}
                  >
                    {!item.userId?.avatar && <PersonIcon />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography 
                        component="span" 
                        variant="subtitle2"
                        fontWeight="bold"
                      >
                        {item.userId?.username || 'Anonymous'}
                      </Typography>
                      <Typography 
                        component="span" 
                        variant="caption" 
                        color="textSecondary"
                      >
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.primary"
                      sx={{ wordBreak: 'break-word' }}
                    >
                      {item.content}
                    </Typography>
                  }
                />
              </ListItem>
              {index < comments.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))
        )}
        <div ref={commentsEndRef} />
        
        {/* Load more button */}
        {hasMore && comments.length > 0 && (
          <Box display="flex" justifyContent="center" mt={2}>
            <Button 
              onClick={loadMoreComments} 
              disabled={loadingMore}
              variant="outlined"
              size="small"
              startIcon={loadingMore ? <CircularProgress size={16} /> : null}
            >
              {loadingMore ? 'Loading...' : 'Load more comments'}
            </Button>
          </Box>
        )}
      </List>
    </Box>
  );
};

export default NewsComments;
