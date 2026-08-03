// In NewsCard.js
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  CardMedia, 
  Button, 
  Box, 
  IconButton, 
  TextField, 
  Collapse,
  Snackbar,
  Alert,
  Avatar,
  CardActions,
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  ThumbUp as LikeIcon, 
  MoodBad as AngryIcon,
  SentimentVeryDissatisfied as SadIcon,
  Favorite as SupportIcon,
  ChatBubbleOutline as CommentIcon,
  Send as SendIcon,
  BookmarkBorder as BookmarkIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { addReaction, getReactions, addComment, subscribeToUpdates } from '../../services/newsInteractionService';
import { useAuth } from '../../context/AuthContext';
import { styled } from '@mui/material/styles';

const ExpandMore = styled((props) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme, expand }) => ({
  transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
}));

const NewsCard = ({ article }) => {
  const { title, description, url, urlToImage, publishedAt, source, id, commentCount = 0 } = article;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comment, setComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [reactions, setReactions] = useState({
    like: 0,
    angry: 0,
    sad: 0,
    support: 0
  });
  const [userReaction, setUserReaction] = useState(null);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  // Load reactions on component mount
  useEffect(() => {
    const loadReactions = async () => {
      try {
        const data = await getReactions(id);
        setReactions(data.reactions);
        setUserReaction(data.userReaction);
      } catch (err) {
        console.error('Error loading reactions:', err);
        setError('Failed to load reactions');
      }
    };

    loadReactions();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToUpdates(id, (data) => {
      if (data.reactions) {
        setReactions(data.reactions);
      }
      if (data.comments) {
        setComments(data.comments);
      }
    });

    return () => unsubscribe();
  }, [id]);

  const handleReaction = async (type) => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    try {
      const newReaction = userReaction === type ? null : type;
      setUserReaction(newReaction);
      
      // Update local state optimistically
      const prevReaction = userReaction;
      const newReactions = { ...reactions };
      
      // Remove previous reaction if exists
      if (prevReaction) {
        newReactions[prevReaction] = Math.max(0, newReactions[prevReaction] - 1);
      }
      
      // Add new reaction if different from previous
      if (newReaction && newReaction !== prevReaction) {
        newReactions[newReaction] = (newReactions[newReaction] || 0) + 1;
      }
      
      setReactions(newReactions);
      
      // Call API to update reaction
      await addReaction(id, { type: newReaction });
    } catch (err) {
      console.error('Error updating reaction:', err);
      setError('Failed to update reaction');
      // Revert on error
      const prevReaction = userReaction;
      setUserReaction(prevReaction);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim() || !user) return;

    try {
      const newComment = {
        id: Date.now().toString(),
        text: comment,
        author: user.displayName || 'Anonymous',
        avatar: user.photoURL,
        timestamp: new Date().toISOString()
      };

      setComments(prev => [newComment, ...prev]);
      setComment('');

      // Call API to add comment
      await addComment(id, { text: comment });
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
    }
  };

  const handleCloseError = () => {
    setError(null);
  };

  const handleCommentClick = (e) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    setShowComments(!showComments);
  };

  const handleCardClick = (e) => {
    // Only navigate if the click wasn't on a button or link
    if (!e.target.closest('button, a, [role="button"], .no-click')) {
      if (url) {
        window.open(url, '_blank');
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  return (
    <Card 
      sx={{ 
        mb: 3, 
        overflow: 'visible',
        '&:hover': {
          boxShadow: 3
        }
      }}
      onClick={handleCardClick}
    >
      {urlToImage && (
        <CardMedia
          component="img"
          height="200"
          image={urlToImage}
          alt={title}
          sx={{ 
            objectFit: 'cover',
            cursor: 'pointer'
          }}
        />
      )}
      
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Chip 
            label={source?.name || 'News'} 
            size="small" 
            sx={{ 
              fontWeight: 500,
              backgroundColor: 'primary.light',
              color: 'primary.contrastText'
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {formatDate(publishedAt)}
          </Typography>
        </Box>
        
        <Typography 
          variant="h6" 
          component="h3" 
          gutterBottom
          sx={{ 
            fontWeight: 600,
            cursor: 'pointer',
            '&:hover': {
              color: 'primary.main'
            }
          }}
        >
          {title}
        </Typography>
        
        <Typography 
          variant="body2" 
          color="text.secondary" 
          paragraph
          sx={{ 
            mb: 2,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {description}
        </Typography>
        
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <IconButton 
              size="small" 
              color={userReaction === 'like' ? 'primary' : 'default'}
              onClick={(e) => {
                e.stopPropagation();
                handleReaction('like');
              }}
              title="Like"
            >
              <LikeIcon fontSize="small" />
              <Typography variant="caption" sx={{ ml: 0.5 }}>
                {reactions.like || ''}
              </Typography>
            </IconButton>
            
            <IconButton 
              size="small" 
              color={userReaction === 'angry' ? 'error' : 'default'}
              onClick={(e) => {
                e.stopPropagation();
                handleReaction('angry');
              }}
              title="Angry"
            >
              <AngryIcon fontSize="small" />
              <Typography variant="caption" sx={{ ml: 0.5 }}>
                {reactions.angry || ''}
              </Typography>
            </IconButton>
            
            <IconButton 
              size="small" 
              color={userReaction === 'sad' ? 'warning' : 'default'}
              onClick={(e) => {
                e.stopPropagation();
                handleReaction('sad');
              }}
              title="Sad"
            >
              <SadIcon fontSize="small" />
              <Typography variant="caption" sx={{ ml: 0.5 }}>
                {reactions.sad || ''}
              </Typography>
            </IconButton>
            
            <IconButton 
              size="small" 
              color={userReaction === 'support' ? 'secondary' : 'default'}
              onClick={(e) => {
                e.stopPropagation();
                handleReaction('support');
              }}
              title="Support"
            >
              <SupportIcon fontSize="small" />
              <Typography variant="caption" sx={{ ml: 0.5 }}>
                {reactions.support || ''}
              </Typography>
            </IconButton>
            
            <IconButton 
              size="small" 
              onClick={handleCommentClick}
              className="no-click"
              title="Comments"
            >
              <CommentIcon fontSize="small" />
              <Typography variant="caption" sx={{ ml: 0.5 }}>
                {comments.length || commentCount}
              </Typography>
            </IconButton>
          </Box>
          
          <Box>
            <IconButton size="small" className="no-click" title="Save">
              <BookmarkBorderIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" className="no-click" title="Share">
              <ShareIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        <Collapse in={showComments} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Box 
              component="form" 
              onSubmit={handleCommentSubmit}
              sx={{ display: 'flex', mb: 2 }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Write a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="no-click"
                InputProps={{
                  endAdornment: (
                    <IconButton 
                      type="submit" 
                      disabled={!comment.trim()}
                      className="no-click"
                    >
                      <SendIcon />
                    </IconButton>
                  )
                }}
              />
            </Box>
            
            {comments.map(comment => (
              <Box 
                key={comment.id} 
                sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  mb: 2,
                  p: 1,
                  backgroundColor: 'action.hover',
                  borderRadius: 1
                }}
              >
                <Avatar 
                  src={comment.avatar} 
                  alt={comment.author} 
                  sx={{ width: 32, height: 32, mt: 0.5 }}
                />
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 500, mr: 1 }}>
                      {comment.author}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(comment.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="body2">{comment.text}</Typography>
                </Box>
              </Box>
            ))}
            
            {comments.length === 0 && (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                textAlign="center"
                sx={{ py: 2 }}
              >
                No comments yet. Be the first to comment!
              </Typography>
            )}
          </Box>
        </Collapse>
      </CardContent>
      
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Card>
  );
};

export default NewsCard;