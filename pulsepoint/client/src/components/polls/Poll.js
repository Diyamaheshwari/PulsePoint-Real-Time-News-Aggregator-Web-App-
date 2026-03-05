import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  LinearProgress, 
  IconButton,
  Menu,
  MenuItem,
  Avatar
} from '@mui/material';
import { MoreVert, ThumbUp } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { formatDistanceToNow } from 'date-fns';

const Poll = ({ poll, onVote, onDelete }) => {
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [localPoll, setLocalPoll] = useState({
    ...poll,
    createdBy: poll.createdBy || { username: 'Unknown User', avatar: '' },
    options: poll.options.map(opt => ({
      ...opt,
      voters: Array.isArray(opt.voters) ? opt.voters : []
    }))
  });

  useEffect(() => {
    // Only update localPoll if poll prop changes
    if (poll) {
      setLocalPoll({
        ...poll,
        createdBy: poll.createdBy || { username: 'Unknown User', avatar: '' },
        options: Array.isArray(poll.options) 
          ? poll.options.map(opt => ({
              ...opt,
              voters: Array.isArray(opt.voters) ? opt.voters : []
            }))
          : []
      });
    }

    // Check if user has already voted
    if (user && poll?.options) {
      const userId = user._id || user.id;
      const voted = poll.options.some(option => 
        Array.isArray(option.voters) && 
        option.voters.some(voter => 
          voter && voter.toString() === userId?.toString()
        )
      );
      setHasVoted(voted);
    }
  }, [poll, user]);

  const handleVote = async () => {
    if (selectedOption === null || hasVoted || !poll?._id) return;
    if (!Array.isArray(localPoll.options) || selectedOption >= localPoll.options.length) return;
    
    try {
      const response = await api.post(`/polls/${poll._id}/vote`, { 
        optionIndex: selectedOption 
      });
      
      if (response?.data) {
        const userId = user?._id || user?.id || 'anonymous';
        
        setLocalPoll(prev => {
          if (!prev || !Array.isArray(prev.options)) return prev;
          
          return {
            ...prev,
            options: prev.options.map((opt, idx) => {
              if (idx === selectedOption) {
                return {
                  ...opt,
                  voters: [...(opt.voters || []), userId]
                };
              }
              return {
                ...opt,
                voters: (opt.voters || []).filter(voterId => 
                  voterId && voterId.toString() !== userId.toString()
                )
              };
            })
          };
        });
        
        setHasVoted(true);
        if (typeof onVote === 'function') {
          onVote(response.data);
        }
      }
    } catch (error) {
      console.error('Error voting:', error);
      // Consider adding user feedback here
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDelete = async () => {
    handleMenuClose();
    if (onDelete) onDelete(poll._id);
  };

  const totalVotes = localPoll.options.reduce((sum, option) => {
    return sum + (Array.isArray(option.voters) ? option.voters.length : 0);
  }, 0);
  
  const isExpired = localPoll?.expiresAt ? new Date(localPoll.expiresAt) < new Date() : true;
  const canDelete = user && (user.isAdmin || (user._id || user.id) === localPoll.createdBy?._id);

  return (
    <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center">
            <Avatar 
              src={localPoll.createdBy.avatar} 
              alt={localPoll.createdBy.username}
              sx={{ width: 40, height: 40, mr: 1 }}
            />
            <Box>
              <Typography variant="subtitle2">{localPoll.createdBy.username}</Typography>
              <Typography variant="caption" color="textSecondary">
                {formatDistanceToNow(new Date(localPoll.createdAt), { addSuffix: true })}
              </Typography>
            </Box>
          </Box>
          {canDelete && (
            <>
              <IconButton onClick={handleMenuOpen} size="small">
                <MoreVert />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={handleDelete}>
                  Delete Poll
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>

        <Typography variant="h6" gutterBottom>{localPoll.question}</Typography>
        {localPoll.description && (
          <Typography variant="body2" color="textSecondary" paragraph>
            {localPoll.description}
          </Typography>
        )}

        <Box mt={2}>
          {localPoll.options.map((option, index) => {
            const percentage = totalVotes > 0 
              ? Math.round((option.voters.length / totalVotes) * 100) 
              : 0;
            const isSelected = selectedOption === index;
            const userId = user?._id || user?.id;
  const hasVotedForOption = hasVoted && userId && option.voters?.some(voter => 
    voter && voter.toString() === userId.toString()
  );

            return (
              <Box 
                key={index} 
                mb={1.5}
                onClick={() => {
                  if (!hasVoted && !isExpired) {
                    setSelectedOption(index);
                  }
                }}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  backgroundColor: hasVotedForOption ? 'action.selected' : 'background.paper',
                  cursor: !hasVoted && !isExpired ? 'pointer' : 'default',
                  '&:hover': {
                    backgroundColor: !hasVoted && !isExpired ? 'action.hover' : 'inherit'
                  },
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: isExpired ? 0.7 : 1
                }}
              >
                <Box 
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${percentage}%`,
                    backgroundColor: 'primary.light',
                    opacity: 0.2,
                    zIndex: 0,
                    transition: 'width 0.5s ease'
                  }}
                />
                <Box position="relative" zIndex={1}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body1">
                      {option.text}
                      {hasVotedForOption && (
                        <ThumbUp color="primary" sx={{ ml: 1, fontSize: 16, verticalAlign: 'middle' }} />
                      )}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {percentage}%
                    </Typography>
                  </Box>
                  {hasVoted && (
                    <LinearProgress 
                      variant="determinate" 
                      value={percentage} 
                      sx={{ mt: 1, height: 4, borderRadius: 2 }}
                    />
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>

        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="textSecondary">
            {totalVotes} vote{totalVotes !== 1 ? 's' : ''} • 
            {isExpired 
              ? 'Poll ended' 
              : `Ends in ${formatDistanceToNow(new Date(localPoll.expiresAt), { addSuffix: true })}`
            }
          </Typography>
          
          {!isExpired && !hasVoted && (
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleVote}
              disabled={selectedOption === null}
              size="small"
            >
              Vote
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

Poll.propTypes = {
  poll: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    question: PropTypes.string.isRequired,
    description: PropTypes.string,
    options: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string.isRequired,
        voters: PropTypes.array
      })
    ).isRequired,
    expiresAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    createdBy: PropTypes.shape({
      _id: PropTypes.string,
      username: PropTypes.string,
      avatar: PropTypes.string
    })
  }).isRequired,
  onVote: PropTypes.func,
  onDelete: PropTypes.func
};

export default React.memo(Poll);
