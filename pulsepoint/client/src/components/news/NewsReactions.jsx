import React, { useState, useEffect } from 'react';
import { 
  Box, 
  IconButton, 
  Tooltip, 
  Typography,
  Popover,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress
} from '@mui/material';
import { 
  ThumbUp as LikeIcon, 
  Favorite as SupportIcon, 
  SentimentVeryDissatisfied as SadIcon, 
  MoodBad as AngryIcon,
  MoreHoriz as MoreIcon
} from '@mui/icons-material';
import { addReaction, getReactions, subscribeToUpdates } from '../../services/newsInteractionService';
import { useAuth } from '../../context/AuthContext';

const REACTION_TYPES = [
  { type: 'like', label: 'Like', icon: <LikeIcon />, color: '#1877f2' },
  { type: 'support', label: 'Support', icon: <SupportIcon />, color: '#f33e58' },
  { type: 'sad', label: 'Sad', icon: <SadIcon />, color: '#f7b125' },
  { type: 'angry', label: 'Angry', icon: <AngryIcon />, color: '#e46a76' },
];

const NewsReactions = ({ articleId }) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState({
    like: 0,
    support: 0,
    sad: 0,
    angry: 0
  });
  const [userReaction, setUserReaction] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reactionDetails, setReactionDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Load reactions
  const loadReactions = async () => {
    try {
      setLoading(true);
      const data = await getReactions(articleId);
      setReactions(data.reactions);
      setUserReaction(data.userReaction);
    } catch (error) {
      console.error('Failed to load reactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReactions();
  }, [articleId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!articleId) return;
    
    const unsubscribe = subscribeToUpdates(articleId, (data) => {
      if (data.type === 'updateReactions') {
        setReactions(data.reactions);
        setUserReaction(data.userReaction);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [articleId]);

  const handleReaction = async (type) => {
    if (!user) return;
    
    try {
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
      
      // Add new reaction if different from previous
      if (newUserReaction && newUserReaction !== previousReaction) {
        newReactions[newUserReaction] = (newReactions[newUserReaction] || 0) + 1;
      }
      
      setReactions(newReactions);
      
      // Send to server
      await addReaction(articleId, newUserReaction);
    } catch (error) {
      console.error('Failed to update reaction:', error);
      // Revert on error
      loadReactions();
    }
  };

  const handleReactionDetailsClick = async (event) => {
    setAnchorEl(event.currentTarget);
    
    try {
      setLoadingDetails(true);
      // In a real app, you would fetch the detailed reaction data here
      // For now, we'll just use the counts we already have
      setReactionDetails({
        like: [],
        support: [],
        sad: [],
        angry: []
      });
    } catch (error) {
      console.error('Failed to load reaction details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseReactionDetails = () => {
    setAnchorEl(null);
    setReactionDetails(null);
  };

  const getTotalReactions = () => {
    return Object.values(reactions).reduce((sum, count) => sum + count, 0);
  };

  const getReactionSummary = () => {
    const activeReactions = REACTION_TYPES.filter(r => reactions[r.type] > 0);
    
    if (activeReactions.length === 0) return null;
    
    return (
      <Box display="flex" alignItems="center" gap={0.5}>
        {activeReactions.slice(0, 3).map((reaction) => (
          <Box 
            key={reaction.type}
            sx={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              bgcolor: 'background.paper',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              '& svg': {
                fontSize: '0.9rem',
                color: reaction.color
              }
            }}
          >
            {reaction.icon}
          </Box>
        ))}
        {activeReactions.length > 3 && (
          <Typography variant="caption" color="textSecondary">
            +{activeReactions.length - 3}
          </Typography>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" gap={1} p={1}>
        {REACTION_TYPES.map((reaction) => (
          <IconButton key={reaction.type} disabled>
            {React.cloneElement(reaction.icon, { sx: { opacity: 0.5 } })}
          </IconButton>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 1 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" p={1}>
        <Box display="flex" gap={1}>
          {REACTION_TYPES.map((reaction) => (
            <Tooltip key={reaction.type} title={reaction.label} arrow>
              <IconButton
                onClick={() => handleReaction(reaction.type)}
                sx={{
                  p: 1,
                  color: userReaction === reaction.type ? reaction.color : 'text.secondary',
                  '&:hover': {
                    color: reaction.color,
                    bgcolor: 'action.hover',
                  },
                }}
              >
                {reaction.icon}
              </IconButton>
            </Tooltip>
          ))}
        </Box>
        
        {(getTotalReactions() > 0 || userReaction) && (
          <Box 
            display="flex" 
            alignItems="center" 
            gap={0.5} 
            sx={{ cursor: 'pointer' }}
            onClick={handleReactionDetailsClick}
          >
            {getReactionSummary()}
            <Typography variant="caption" color="textSecondary">
              {getTotalReactions()}
            </Typography>
            <MoreIcon fontSize="small" color="action" />
          </Box>
        )}
      </Box>

      {/* Reaction details popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleCloseReactionDetails}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Box sx={{ width: 300, maxHeight: 400, overflow: 'auto' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2">Reactions</Typography>
          </Box>
          
          {loadingDetails ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress size={24} />
            </Box>
          ) : reactionDetails ? (
            <List>
              {REACTION_TYPES.filter(r => reactions[r.type] > 0).map((reaction, index) => (
                <React.Fragment key={reaction.type}>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {React.cloneElement(reaction.icon, { 
                        style: { color: reaction.color } 
                      })}
                    </ListItemIcon>
                    <ListItemText 
                      primary={`${reaction.label} (${reactions[reaction.type]})`}
                      primaryTypographyProps={{
                        variant: 'body2',
                        color: 'text.primary'
                      }}
                    />
                  </ListItem>
                  {index < REACTION_TYPES.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box p={2}>
              <Typography variant="body2" color="textSecondary" align="center">
                No reactions yet
              </Typography>
            </Box>
          )}
        </Box>
      </Popover>
    </Box>
  );
};

export default NewsReactions;
