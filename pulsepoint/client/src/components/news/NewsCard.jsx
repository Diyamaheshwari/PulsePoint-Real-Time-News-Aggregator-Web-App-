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
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  ThumbUp as LikeIcon, 
  MoodBad as AngryIcon,
  SentimentVeryDissatisfied as SadIcon,
  Favorite as SupportIcon,
  ChatBubbleOutline as CommentIcon,
  Send as SendIcon
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Format the published date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  useEffect(() => {
    const loadReactions = async () => {
      try {
        const data = await getReactions(id);
        setReactions(data.reactions || {
          like: 0,
          angry: 0,
          sad: 0,
          support: 0
        });
        setUserReaction(data.userReaction || null);
      } catch (err) {
        console.error('Failed to load reactions:', err);
        setError('Failed to load reactions');
      } finally {
        setLoading(false);
      }
    };

    loadReactions();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToUpdates(id, (data) => {
      if (data.type === 'reaction') {
        setReactions(data.reactions);
        if (data.userId === user?._id) {
          setUserReaction(data.userReaction);
        }
      } else if (data.type === 'comment') {
        // Handle new comment if needed
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [id, user?._id]);

  const handleReaction = async (type) => {
    if (!user) {
      setError('Please log in to react');
      return;
    }

    // Optimistic update
    const previousReaction = userReaction;
    const newUserReaction = previousReaction === type ? null : type;
    
    setUserReaction(newUserReaction);
    
    // Update counts optimistically
    const newReactions = { ...reactions };
    
    // Remove previous reaction if exists
    if (previousReaction) {
      newReactions[previousReaction] = Math.max(0, newReactions[previousReaction] - 1);
    }
    
    // Add new reaction if not toggling off
    if (newUserReaction) {
      newReactions[newUserReaction] = (newReactions[newUserReaction] || 0) + 1;
    }
    
    setReactions(newReactions);
    
    try {
      await addReaction(id, newUserReaction);
    } catch (err) {
      console.error('Failed to save reaction:', err);
      // Revert on error
      setUserReaction(previousReaction);
      // TODO: Revert reactions state
      setError('Failed to save reaction');
    }
  };

  const handleCommentSubmit = async () => {
    if (!comment.trim() || !user) return;
    
    const commentContent = comment.trim();
    setComment('');
    
    try {
      await addComment(id, commentContent);
      // The comment will be added via the WebSocket update
    } catch (err) {
      console.error('Failed to post comment:', err);
      setError('Failed to post comment');
    }
  };

  const handleCloseError = () => {
    setError(null);
  };

  const handleCommentClick = (e) => {
    e.stopPropagation();
    navigate(`/news/article/${id}/comments`);
  };

  return (
    <>
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 3,
          },
        }}
      >
        {urlToImage && (
          <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
            <CardMedia
              component="img"
              image={urlToImage || 'https://via.placeholder.com/300x140'}
              alt={title}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </Box>
        )}
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography 
            gutterBottom 
            variant="h6" 
            component="h3"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              mb: 2,
              minHeight: '4.5em',
            }}
          >
            {title}
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 2,
              flexGrow: 1,
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description || 'No description available.'}
          </Typography>
          <Box sx={{ mt: 'auto' }}>
            {/* Reactions */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <IconButton 
                  size="small" 
                  color={userReaction === 'like' ? 'primary' : 'default'}
                  onClick={() => handleReaction('like')}
                  disabled={loading}
                >
                  <LikeIcon fontSize="small" />
                  {reactions.like > 0 && <span style={{ fontSize: '0.75rem', marginLeft: 4 }}>{reactions.like}</span>}
                </IconButton>
                <IconButton 
                  size="small" 
                  color={userReaction === 'angry' ? 'error' : 'default'}
                  onClick={() => handleReaction('angry')}
                  disabled={loading}
                >
                  <AngryIcon fontSize="small" />
                  {reactions.angry > 0 && <span style={{ fontSize: '0.75rem', marginLeft: 4 }}>{reactions.angry}</span>}
                </IconButton>
                <IconButton 
                  size="small" 
                  color={userReaction === 'sad' ? 'warning' : 'default'}
                  onClick={() => handleReaction('sad')}
                  disabled={loading}
                >
                  <SadIcon fontSize="small" />
                  {reactions.sad > 0 && <span style={{ fontSize: '0.75rem', marginLeft: 4 }}>{reactions.sad}</span>}
                </IconButton>
                <IconButton 
                  size="small" 
                  color={userReaction === 'support' ? 'secondary' : 'default'}
                  onClick={() => handleReaction('support')}
                  disabled={loading}
                >
                  <SupportIcon fontSize="small" />
                  {reactions.support > 0 && <span style={{ fontSize: '0.75rem', marginLeft: 4 }}>{reactions.support}</span>}
                </IconButton>
              </Box>
              <Box>
                <IconButton 
                  size="small" 
                  color={showComments ? 'primary' : 'default'}
                  onClick={handleCommentClick}
                  aria-label="Show comments"
                  disabled={!user}
                >
                  <CommentIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Comments Section */}
            <Collapse in={showComments} timeout="auto" unmountOnExit>
              <Box sx={{ mt: 1, mb: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder={user ? 'Write a comment...' : 'Please log in to comment'}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    variant="outlined"
                    disabled={!user}
                    onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit()}
                  />
                  <IconButton 
                    color="primary" 
                    onClick={handleCommentSubmit}
                    disabled={!comment.trim() || !user}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            </Collapse>

            {/* Source and Read More */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{
                  fontSize: '0.7rem',
                }}
              >
                {source?.name} • {new Date(publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </Typography>
              <Button 
                size="small" 
                color="primary" 
                component="a" 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{
                  textTransform: 'none',
                  fontSize: '0.7rem',
                  p: 0,
                  minWidth: 'auto',
                }}
              >
                Read More
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

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
    </>
  );
};

export default NewsCard;
