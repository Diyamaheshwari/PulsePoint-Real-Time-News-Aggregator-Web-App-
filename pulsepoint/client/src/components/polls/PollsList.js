import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  Tabs, 
  Tab, 
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import Poll from './Poll';
import CreatePollForm from './CreatePollForm';
import api from '../../utils/api';
import { useWebSocket } from '../../context/WebSocketContext';

const PollsList = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { socket, isConnected } = useWebSocket();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const limit = 10;

  const fetchPolls = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = await api.get(`/polls?page=${pageNum}&limit=${limit}&status=${activeTab}`);
      
      if (append) {
        setPolls(prev => [...prev, ...response.data.polls]);
      } else {
        setPolls(response.data.polls);
      }
      
      setHasMore(response.data.polls.length === limit);
    } catch (error) {
      console.error('Error fetching polls:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load polls',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPolls(1, false);
  }, [activeTab]);

  // Handle WebSocket updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handlePollUpdate = (data) => {
      setPolls(prevPolls => 
        prevPolls.map(poll => 
          poll._id === data.pollId ? { ...poll, ...data.poll } : poll
        )
      );
    };

    const handleNewPoll = (newPoll) => {
      setPolls(prevPolls => [newPoll, ...prevPolls]);
    };

    socket.on('pollUpdate', handlePollUpdate);
    socket.on('newPoll', handleNewPoll);

    return () => {
      if (socket) {
        socket.off('pollUpdate', handlePollUpdate);
        socket.off('newPoll', handleNewPoll);
      }
    };
  }, [socket, isConnected]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setPage(1);
  };

  const handleVote = (updatedPoll) => {
    setPolls(prevPolls => 
      prevPolls.map(poll => 
        poll._id === updatedPoll._id ? updatedPoll : poll
      )
    );
  };

  const handlePollCreated = (newPoll) => {
    setPolls(prevPolls => [newPoll, ...prevPolls]);
    setSnackbar({
      open: true,
      message: 'Poll created successfully!',
      severity: 'success'
    });
  };

  const handleDeletePoll = async (pollId) => {
    try {
      await api.delete(`/polls/${pollId}`);
      setPolls(prevPolls => prevPolls.filter(poll => poll._id !== pollId));
      setSnackbar({
        open: true,
        message: 'Poll deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting poll:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete poll',
        severity: 'error'
      });
    }
  };

  const loadMorePolls = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPolls(nextPage, true);
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (loading && page === 1) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="polls navigation"
          sx={{
            '& .MuiTab-root': {
              minWidth: 100,
              textTransform: 'none',
              fontWeight: 500,
            },
            '& .Mui-selected': {
              fontWeight: 600,
            },
          }}
        >
          <Tab label="Active" value="active" />
          <Tab label="Ended" value="ended" />
        </Tabs>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setShowCreateForm(true)}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500 }}
        >
          Create Poll
        </Button>
      </Box>

      {polls.length === 0 ? (
        <Box 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center" 
          minHeight="200px"
          textAlign="center"
          p={3}
          sx={{ 
            backgroundColor: 'background.paper',
            borderRadius: 2,
            border: '1px dashed',
            borderColor: 'divider'
          }}
        >
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No {activeTab === 'active' ? 'active' : 'ended'} polls found
          </Typography>
          <Typography variant="body2" color="textSecondary" mb={2}>
            {activeTab === 'active' 
              ? 'Be the first to create a poll!' 
              : 'Check back later for ended polls'}
          </Typography>
          {activeTab === 'active' && (
            <Button 
              variant="outlined" 
              color="primary"
              onClick={() => setShowCreateForm(true)}
              startIcon={<AddIcon />}
            >
              Create Poll
            </Button>
          )}
        </Box>
      ) : (
        <Box>
          {polls.map((poll) => (
            <Poll 
              key={poll._id} 
              poll={poll} 
              onVote={handleVote}
              onDelete={handleDeletePoll}
            />
          ))}
          
          {hasMore && (
            <Box display="flex" justifyContent="center" mt={3} mb={4}>
              <Button 
                onClick={loadMorePolls} 
                variant="outlined"
                disabled={isLoadingMore}
                startIcon={isLoadingMore ? <CircularProgress size={20} /> : null}
              >
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </Button>
            </Box>
          )}
        </Box>
      )}

      <CreatePollForm 
        open={showCreateForm} 
        onClose={() => setShowCreateForm(false)}
        onPollCreated={handlePollCreated}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PollsList;
