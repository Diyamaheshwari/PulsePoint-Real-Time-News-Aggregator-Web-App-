import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

const CommentsPage = () => {
  const navigate = useNavigate();

  return (
    <Box p={2}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h1">
          Comments Page
        </Typography>
      </Box>
      
      <Box>
        <Typography>This is a simple comments page.</Typography>
      </Box>
    </Box>
  );
};

export default CommentsPage;
