import React, { useState, useEffect, useContext } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Divider, 
  LinearProgress, 
  Chip,
  IconButton,
  Tooltip,
  Avatar
} from '@mui/material';
import { Poll as PollIcon, EmojiEvents, BarChart, HowToVote } from '@mui/icons-material';
import { useWebSocket } from '../../../context/WebSocketContext';
import authContext from '../../../context/auth/authContext';
import axios from 'axios';

const DailyPolls = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState({});
  const { user } = useContext(authContext);
  const socket = useWebSocket();

  useEffect(() => {
    fetchDailyPolls();
    
    // Set up WebSocket listener for real-time poll updates
    if (socket) {
      socket.on('pollUpdate', (updatedPoll) => {
        setPolls(prevPolls => 
          prevPolls.map(poll => 
            poll._id === updatedPoll._id ? updatedPoll : poll
          )
        );
      });

      return () => {
        socket.off('pollUpdate');
      };
    }
  }, [socket]);

  const fetchDailyPolls = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/polls/daily');
      setPolls(response.data);
      
      // Initialize selected options
      const userSelections = {};
      response.data.forEach(poll => {
        const userVote = poll.votes?.find(vote => vote.user.toString() === user?._id);
        if (userVote) {
          userSelections[poll._id] = userVote.optionIndex;
        }
      });
      setSelectedOptions(userSelections);
    } catch (error) {
      console.error('Error fetching polls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId, optionIndex) => {
    if (!user) return;
    
    try {
      await axios.post(`/api/polls/${pollId}/vote`, { optionIndex });
      
      // Optimistic UI update
      setPolls(prevPolls => 
        prevPolls.map(poll => {
          if (poll._id === pollId) {
            const updatedPoll = { ...poll };
            const existingVoteIndex = updatedPoll.votes.findIndex(
              v => v.user.toString() === user._id
            );
            
            if (existingVoteIndex >= 0) {
              // Update existing vote
              updatedPoll.votes[existingVoteIndex].optionIndex = optionIndex;
            } else {
              // Add new vote
              updatedPoll.votes.push({
                user: user._id,
                optionIndex,
                _id: Date.now().toString() // Temporary ID
              });
            }
            
            // Recalculate vote counts
            updatedPoll.options = updatedPoll.options.map((opt, idx) => ({
              ...opt,
              voteCount: updatedPoll.votes.filter(v => v.optionIndex === idx).length
            }));
            
            return updatedPoll;
          }
          return poll;
        })
      );
      
      // Update selected options
      setSelectedOptions(prev => ({
        ...prev,
        [pollId]: optionIndex
      }));
      
    } catch (error) {
      console.error('Error voting:', error);
      // Revert optimistic update on error
      fetchDailyPolls();
    }
  };

  const calculatePercentage = (poll, optionIndex) => {
    const totalVotes = poll.votes?.length || 0;
    if (totalVotes === 0) return 0;
    
    const optionVotes = poll.votes?.filter(v => v.optionIndex === optionIndex).length || 0;
    return Math.round((optionVotes / totalVotes) * 100);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading polls...</Typography>
      </Box>
    );
  }

  if (polls.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <PollIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6">No polls available</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Check back later for new polls!
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <EmojiEvents sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h5" component="h2">
          Today's Polls
        </Typography>
      </Box>
      
      {polls.map((poll) => (
        <Paper 
          key={poll._id} 
          elevation={2} 
          sx={{ 
            mb: 3, 
            p: 3, 
            borderRadius: 2,
            borderLeft: `4px solid ${poll.categoryColor || '#3f51b5'}`
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" component="h3">
              {poll.question}
            </Typography>
            <Chip 
              label={poll.category} 
              size="small" 
              sx={{ 
                backgroundColor: `${poll.categoryColor || '#3f51b5'}20`,
                color: poll.categoryColor || '#3f51b5',
                fontWeight: 500
              }} 
            />
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {poll.description}
          </Typography>
          
          <Box sx={{ mt: 2, mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <HowToVote fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {poll.votes?.length || 0} votes • {poll.isActive ? 'Live' : 'Ended'}
              </Typography>
            </Box>
            
            {poll.options.map((option, index) => {
              const percentage = calculatePercentage(poll, index);
              const isSelected = selectedOptions[poll._id] === index;
              
              return (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box 
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 0.5,
                      position: 'relative',
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: isSelected ? '2px solid #3f51b5' : '1px solid #e0e0e0',
                      backgroundColor: isSelected ? '#f5f8ff' : 'background.paper',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: isSelected ? '#3f51b5' : '#bdbdbd',
                        backgroundColor: isSelected ? '#edf1fb' : '#f5f5f5',
                      },
                      cursor: 'pointer',
                    }}
                    onClick={() => handleVote(poll._id, index)}
                  >
                    <Box 
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: `${percentage}%`,
                        backgroundColor: isSelected ? '#e3f2fd' : '#f0f0f0',
                        zIndex: 0,
                        transition: 'width 0.5s ease-in-out',
                      }}
                    />
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        p: 1.5,
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1">
                          {option.text}
                          {isSelected && (
                            <Chip 
                              label="Your vote" 
                              size="small" 
                              sx={{ 
                                ml: 1,
                                height: 20,
                                fontSize: '0.7rem',
                                backgroundColor: 'primary.light',
                                color: 'primary.contrastText',
                              }} 
                            />
                          )}
                        </Typography>
                      </Box>
                      <Typography variant="subtitle2" sx={{ minWidth: 40, textAlign: 'right' }}>
                        {percentage}%
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Poll ends {new Date(poll.endTime).toLocaleString()}
              </Typography>
              <Box>
                {poll.source && (
                  <Tooltip title="View source">
                    <IconButton size="small" href={poll.source} target="_blank" rel="noopener">
                      <Avatar 
                        src={poll.sourceLogo} 
                        alt={poll.source} 
                        sx={{ width: 20, height: 20 }}
                      />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          </Box>
        </Paper>
      ))}
      
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button 
          variant="outlined" 
          startIcon={<BarChart />}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          View All Polls
        </Button>
      </Box>
    </Box>
  );
};

export default DailyPolls;
