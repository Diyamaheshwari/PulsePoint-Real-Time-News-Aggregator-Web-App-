import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  LinearProgress, 
  Button, 
  Avatar,
  IconButton,
  Alert,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Radio,
  RadioGroup,
  FormControl,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import { 
  Edit,
  Delete,
  MoreVert,
  AccessTime,
  HowToVote,
  Close
} from '@mui/icons-material';
import { formatDistanceToNow, format, isAfter } from 'date-fns';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';

const Poll = ({ poll, onVote, onDelete, onUpdate, showFull = false }) => {
  // Hooks must be called at the top level, before any conditional returns
  const { user } = useAuth();
  const { socket } = useWebSocket();
  
  // State for voting
  const [selectedOption, setSelectedOption] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  
  // State for poll data
  const [options, setOptions] = useState([]);
  
  // State for UI feedback
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // State for edit dialog
  const [anchorEl, setAnchorEl] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState('');
  const [editedOptions, setEditedOptions] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Derived state
  const [isPollReady, setIsPollReady] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  
  // Update derived state when poll changes
  useEffect(() => {
    if (!poll) {
      setIsPollReady(false);
      return;
    }
    
    setVoteCount(poll.totalVotes || 0);
    setOptions(poll.options || []);
    setEditedQuestion(poll.question || '');
    setEditedOptions(poll.options?.map(opt => opt.text) || []);
    
    // Calculate derived state
    const owner = user?._id && poll?.createdBy?._id && user._id === poll.createdBy._id;
    const expired = poll?.expiresAt ? isAfter(new Date(), new Date(poll.expiresAt)) : true;
    
    setIsOwner(owner);
    setIsExpired(expired);
    setExpiresAt(poll?.expiresAt ? format(new Date(poll.expiresAt), 'PPpp') : '');
    setTimeLeft(poll?.expiresAt ? formatDistanceToNow(new Date(poll.expiresAt), { addSuffix: true }) : '');
    
    setIsPollReady(true);
  }, [poll, user]);
  
  // Calculate derived state with null checks
  const menuOpen = Boolean(anchorEl);

  useEffect(() => {
    // Reset state when poll prop changes
    setVoteCount(poll.totalVotes || 0);
    setOptions(poll.options || []);
    setEditedQuestion(poll.question);
    setEditedOptions(poll.options?.map(opt => opt.text) || []);
    
    // Check if user has already voted
    if (user?._id && Array.isArray(poll?.options)) {
      const userVotedOption = poll.options.find(option => {
        if (!option || !Array.isArray(option.voters)) return false;
        
        return option.voters.some(voter => {
          if (!voter) return false;
          try {
            const voterId = typeof voter === 'object' 
              ? (voter && typeof voter._id !== 'undefined' ? voter._id : null)
              : voter;
            return voterId && user._id && voterId.toString() === user._id.toString();
          } catch (e) {
            console.error('Error processing voter:', e);
            return false;
          }
        });
      });
      
      if (userVotedOption?._id) {
        setSelectedOption(userVotedOption._id);
      }
    }
    
    // Set up WebSocket listener for real-time updates
    if (socket) {
      socket.on('pollUpdate', (updatedPoll) => {
        if (updatedPoll._id === poll._id) {
          setOptions(updatedPoll.options);
          setVoteCount(updatedPoll.totalVotes);
        }
      });
      
      socket.on('pollDeleted', (deletedPoll) => {
        if (deletedPoll._id === poll._id) {
          onDelete?.(poll._id);
        }
      });
    }
    
    // Clean up event listeners
    return () => {
      if (socket) {
        socket.off('pollUpdate');
        socket.off('pollDeleted');
      }
    };
  }, [poll, user, socket, onDelete]);
  
  const handleVote = async () => {
    if (selectedOption === null || isExpired) return;
    
    try {
      setIsVoting(true);
      setError('');
      
      // Find the selected option and its index
      const optionIndex = options.findIndex(opt => opt._id === selectedOption);
      if (optionIndex === -1) {
        throw new Error('Selected option not found');
      }
      
      // Make sure user is authenticated
      if (!user || !user._id) {
        throw new Error('You must be logged in to vote');
      }
      
      console.log('Sending vote request:', {
        pollId: poll._id,
        optionIndex,
        userId: user._id
      });
      
      // Send the vote to the server
      const response = await api.post(`/polls/${poll._id}/vote`, { 
        optionIndex 
      });
      
      // Update local state with the response from the server
      const updatedPoll = response.data;
      setOptions(updatedPoll.options);
      setVoteCount(updatedPoll.totalVotes);
      setSuccess('Your vote has been recorded!');
      
      // Notify parent component of the update
      onVote?.(updatedPoll);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error voting:', error);
      const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'Failed to submit vote. Please try again.';
      setError(errorMessage);
      
      // If it's an authentication error, redirect to login
      if (error.response?.status === 401) {
        // You might want to redirect to login here
        console.log('Authentication required');
      }
    } finally {
      setIsVoting(false);
    }
  };
  
  const hasUserVoted = () => {
    try {
      // Add more defensive checks
      if (!user || !user._id || !Array.isArray(options) || !poll?._id) return false;
      
      return options.some(option => {
        if (!option || !option._id || !Array.isArray(option.voters)) return false;
        
        return option.voters.some(voter => {
          if (!voter) return false;
          try {
            const voterId = typeof voter === 'object' 
              ? (voter && typeof voter._id !== 'undefined' ? voter._id : null)
              : voter;
            return voterId && user._id && voterId.toString() === user._id.toString();
          } catch (e) {
            console.error('Error processing voter:', e);
            return false;
          }
        });
      });
    } catch (error) {
      console.error('Error in hasUserVoted:', error);
      return false;
    }
  };
  
  const getVotePercentage = (option) => {
    if (voteCount === 0) return 0;
    const votes = option.voters?.length || 0;
    return Math.round((votes / voteCount) * 100);
  };
  
  const renderPollOptions = () => {
    if (isExpired || hasUserVoted()) {
      return (
        <Box mt={2}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {isExpired 
              ? `This poll has ended. ${voteCount} total votes.`
              : `You've already voted. ${voteCount} total votes.`}
          </Typography>
          {options.map((option) => (
            <Box key={option._id} mb={2}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="body1">{option.text}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {getVotePercentage(option)}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={getVotePercentage(option)} 
                sx={{ 
                  height: 8, 
                  borderRadius: 5,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: 'primary.main',
                  }
                }}
              />
              <Box display="flex" justifyContent="flex-end">
                <Typography variant="caption" color="textSecondary">
                  {option.voters?.length || 0} votes
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      );
    }
    
    // Show voting interface
    return (
      <FormControl component="fieldset" fullWidth>
        <RadioGroup
          value={selectedOption || ''}
          onChange={(e) => setSelectedOption(e.target.value)}
        >
          {options.map((option) => (
            <Card 
              key={option._id} 
              variant="outlined" 
              sx={{ 
                mb: 1,
                borderColor: selectedOption === option._id ? 'primary.main' : 'divider',
                backgroundColor: selectedOption === option._id ? 'action.hover' : 'background.paper',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover',
                },
              }}
              onClick={() => setSelectedOption(option._id)}
            >
              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <Box display="flex" alignItems="center">
                  <Radio 
                    value={option._id} 
                    checked={selectedOption === option._id}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ mr: 1 }}
                  />
                  <Typography>{option.text}</Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </RadioGroup>
        
        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="textSecondary">
            {voteCount} {voteCount === 1 ? 'vote' : 'votes'} • Ends {timeLeft}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleVote}
            disabled={!selectedOption || isVoting}
            startIcon={<HowToVote />}
          >
            {isVoting ? 'Voting...' : 'Vote'}
          </Button>
        </Box>
      </FormControl>
    );
  };
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleEditClick = () => {
    setEditedQuestion(poll.question);
    setEditedOptions(poll.options.map(opt => opt.text));
    setIsEditDialogOpen(true);
    handleMenuClose();
  };
  
  const handleDeleteClick = async () => {
    if (!window.confirm('Are you sure you want to delete this poll? This action cannot be undone.')) {
      handleMenuClose();
      return;
    }
    
    try {
      setIsDeleting(true);
      await onDelete?.(poll._id);
    } catch (error) {
      console.error('Error deleting poll:', error);
      setError('Failed to delete poll. Please try again.');
    } finally {
      setIsDeleting(false);
      handleMenuClose();
    }
  };
  
  const handleEditOptionChange = (index, value) => {
    const newOptions = [...editedOptions];
    newOptions[index] = value;
    setEditedOptions(newOptions);
  };
  
  const handleAddOption = () => {
    if (editedOptions.length < 5) {
      setEditedOptions([...editedOptions, '']);
    }
  };
  
  const handleRemoveOption = (index) => {
    if (editedOptions.length > 2) {
      const newOptions = editedOptions.filter((_, i) => i !== index);
      setEditedOptions(newOptions);
    }
  };
  
  const handleEditSubmit = async () => {
    try {
      const updatedPoll = {
        question: editedQuestion,
        options: editedOptions.map((text, index) => ({
          _id: poll.options[index]?._id || undefined,
          text: text.trim(),
          voters: poll.options[index]?.voters || []
        }))
      };
      
      const response = await api.put(`/api/polls/${poll._id}`, updatedPoll);
      onUpdate?.(response.data);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating poll:', error);
      setError(error.response?.data?.message || 'Failed to update poll. Please try again.');
    }
  };
  
  const handleCloseError = () => {
    setError('');
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        mb: 3, 
        position: 'relative',
        borderLeft: `4px solid ${isExpired ? 'error.main' : 'primary.main'}`,
        opacity: isExpired ? 0.9 : 1,
      }}
    >
      {/* Poll header with author and menu */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box display="flex" alignItems="center">
          {poll.createdBy && (
            <Avatar src={poll.createdBy.avatar} alt={poll.createdBy.name || 'Anonymous'} />
          )}
          <Box ml={1.5}>
            <Box display="flex" alignItems="center">
              <Typography variant="subtitle1" fontWeight="medium">
                {poll.createdBy?.name || 'Anonymous'}
              </Typography>
              {isOwner && (
                <Chip 
                  label="Your Poll" 
                  size="small" 
                  sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} 
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
            <Typography variant="caption" color="textSecondary">
              {formatDistanceToNow(new Date(poll.createdAt), { addSuffix: true })}
            </Typography>
          </Box>
        </Box>
        
        <Box display="flex" alignItems="center">
          {isExpired ? (
            <Chip 
              icon={<AccessTime fontSize="small" />} 
              label="Ended" 
              size="small"
              color="error"
              variant="outlined"
              sx={{ mr: 1 }}
            />
          ) : (
            <Chip 
              icon={<HowToVote fontSize="small" />} 
              label={`Ends ${timeLeft}`} 
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mr: 1 }}
            />
          )}
          
          {isOwner && (
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              aria-label="poll options"
              disabled={isDeleting}
            >
              <MoreVert />
            </IconButton>
          )}
        </Box>
        
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={handleEditClick} disabled={isExpired}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Edit Poll
          </MenuItem>
          <MenuItem onClick={handleDeleteClick} disabled={isDeleting}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            {isDeleting ? 'Deleting...' : 'Delete Poll'}
          </MenuItem>
        </Menu>
      </Box>

      {/* Poll question */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 500, color: 'text.primary' }}>
        {poll.question}
      </Typography>

      {/* Poll description */}
      {poll.description && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {poll.description}
        </Typography>
      )}

      {/* Messages */}
      <Box mt={2}>
        {error && <Alert severity="error" onClose={handleCloseError} sx={{ mb: 1 }}>{error}</Alert>}
        {success && <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>}
      </Box>

      {/* Poll options */}
      {renderPollOptions()}
      
      {/* Poll metadata */}
      <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" color="textSecondary">
          {isExpired ? 'Ended' : 'Ends'} {expiresAt}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
        </Typography>
      </Box>
      
      {/* Edit poll dialog */}
      <Dialog open={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Poll</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Question"
            type="text"
            fullWidth
            variant="outlined"
            value={editedQuestion}
            onChange={(e) => setEditedQuestion(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Typography variant="subtitle2" gutterBottom>Options:</Typography>
          {editedOptions.map((option, index) => (
            <Box key={index} display="flex" alignItems="center" mb={1}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={option}
                onChange={(e) => handleEditOptionChange(index, e.target.value)}
                sx={{ flexGrow: 1 }}
              />
              {editedOptions.length > 2 && (
                <IconButton 
                  size="small" 
                  onClick={() => handleRemoveOption(index)}
                  sx={{ ml: 1 }}
                >
                  <Close fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}
          
          {editedOptions.length < 5 && (
            <Button 
              variant="outlined"
              onClick={handleAddOption}
              size="small"
              sx={{ mt: 1 }}
            >
              Add Option
            </Button>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleEditSubmit} 
            variant="contained"
            disabled={!editedQuestion.trim() || editedOptions.some(opt => !opt.trim())}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default Poll;