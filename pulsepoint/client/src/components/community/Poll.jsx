import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Button, 
  Divider, 
  LinearProgress, 
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  Poll as PollIcon, 
  Check as CheckIcon, 
  Share as ShareIcon,
  MoreVert as MoreVertIcon,
  BarChart as BarChartIcon,
  HowToVote as HowToVoteIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../hooks';
import { useCommunity } from '../../context/CommunityContext';

const Poll = ({ poll, isDaily = false }) => {
  const { user } = useAuth();
  const { voteInPoll } = useCommunity();
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');

  // Check if user has already voted
  useEffect(() => {
    if (poll && user) {
      const userVoted = poll.options.some(option => 
        option.voters?.some(voter => voter === user._id)
      );
      setHasVoted(userVoted);
      setShowResults(userVoted);
    }
  }, [poll, user]);

  // Calculate time remaining
  useEffect(() => {
    if (!poll?.expiresAt) return;

    const updateTimeRemaining = () => {
      const now = new Date();
      const expiresAt = new Date(poll.expiresAt);
      const diffMs = expiresAt - now;
      
      if (diffMs <= 0) {
        setTimeRemaining('Poll ended');
        return;
      }

      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (diffDays > 0) {
        setTimeRemaining(`Ends in ${diffDays} day${diffDays > 1 ? 's' : ''}`);
      } else if (diffHours > 0) {
        setTimeRemaining(`Ends in ${diffHours} hour${diffHours > 1 ? 's' : ''}`);
      } else {
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`Ends in ${diffMins} min${diffMins !== 1 ? 's' : ''}`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [poll?.expiresAt]);

  const handleVote = async () => {
    if (selectedOption === null || !poll._id) return;
    
    try {
      await voteInPoll(poll._id, selectedOption);
      setHasVoted(true);
      setShowResults(true);
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleMenuOpen = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleShare = () => {
    // Implement share functionality
    console.log('Sharing poll:', poll._id);
    handleMenuClose();
  };

  const totalVotes = poll?.totalVotes || 0;
  const isExpired = new Date(poll?.expiresAt) < new Date();
  const showVoteResults = showResults || isExpired;

  return (
    <Card 
      sx={{ 
        mb: 3, 
        borderRadius: 2, 
        boxShadow: 3,
        borderLeft: isDaily ? '4px solid' : 'none',
        borderColor: 'primary.main'
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <PollIcon color={isDaily ? 'primary' : 'action'} />
            <Typography variant="h6" component="div">
              {isDaily ? 'Daily Poll' : 'Community Poll'}
            </Typography>
            {isDaily && (
              <Chip 
                label="Today" 
                size="small" 
                color="primary" 
                variant="outlined"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          <Box>
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleShare}>
                <ListItemIcon>
                  <ShareIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Share</ListItemText>
              </MenuItem>
              {hasVoted && (
                <MenuItem onClick={() => setShowResults(!showResults)}>
                  <ListItemIcon>
                    {showResults ? <HowToVoteIcon fontSize="small" /> : <BarChartIcon fontSize="small" />}
                  </ListItemIcon>
                  <ListItemText>{showResults ? 'Show Voting' : 'Show Results'}</ListItemText>
                </MenuItem>
              )}
            </Menu>
          </Box>
        </Box>

        <Typography variant="h6" fontWeight="bold" gutterBottom>
          {poll?.question}
        </Typography>
        
        {poll?.description && (
          <Typography variant="body2" color="text.secondary" paragraph>
            {poll.description}
          </Typography>
        )}

        <Box sx={{ my: 2 }}>
          {poll?.options?.map((option, index) => {
            const optionVotes = option.voters?.length || 0;
            const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
            const isSelected = selectedOption === index;
            const userVotedThisOption = option.voters?.some(voter => voter === user?._id);

            return (
              <Box 
                key={index} 
                sx={{ 
                  mb: 2, 
                  p: 1.5, 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: isSelected || userVotedThisOption ? 'primary.main' : 'divider',
                  backgroundColor: isSelected || userVotedThisOption ? 'action.hover' : 'background.paper',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: !hasVoted && !isExpired ? 'pointer' : 'default',
                  '&:hover': {
                    borderColor: !hasVoted && !isExpired ? 'primary.main' : 'divider',
                    backgroundColor: !hasVoted && !isExpired ? 'action.hover' : 'background.paper'
                  }
                }}
                onClick={() => !hasVoted && !isExpired && setSelectedOption(index)}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: isSelected || userVotedThisOption ? 'bold' : 'normal',
                      zIndex: 1
                    }}
                  >
                    {option.text}
                  </Typography>
                  {(hasVoted || isExpired) && (
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1, zIndex: 1 }}>
                      {percentage}%
                    </Typography>
                  )}
                </Box>

                {(hasVoted || isExpired) && (
                  <Box sx={{ position: 'relative', width: '100%', height: 6, bgcolor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
                    <Box 
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: `${percentage}%`,
                        bgcolor: 'primary.main',
                        transition: 'width 0.5s ease-in-out',
                        opacity: 0.7
                      }}
                    />
                  </Box>
                )}

                {userVotedThisOption && (
                  <Box 
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1
                    }}
                  >
                    <CheckIcon sx={{ color: 'white', fontSize: 14 }} />
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {totalVotes} vote{totalVotes !== 1 ? 's' : ''} • {timeRemaining}
          </Typography>
          
          {!hasVoted && !isExpired ? (
            <Button 
              variant="contained" 
              size="small" 
              onClick={handleVote}
              disabled={selectedOption === null}
              startIcon={<HowToVoteIcon />}
            >
              Vote
            </Button>
          ) : (
            <Button 
              size="small" 
              onClick={() => setShowResults(!showResults)}
              startIcon={showResults ? <HowToVoteIcon /> : <BarChartIcon />}
            >
              {showResults ? 'Vote Again' : 'View Results'}
            </Button>
          )}
        </Box>

        {poll?.tags?.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 2 }}>
            {poll.tags.map((tag, index) => (
              <Chip 
                key={index} 
                label={`#${tag}`} 
                size="small" 
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default Poll;
