import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Paper,
  Divider,
  Avatar,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import api from '../utils/api';
import { format, addDays } from 'date-fns';

const PollForm = ({ onPollCreated, onCancel }) => {
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [expiresIn, setExpiresIn] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const expirationOptions = [
    { value: '1', label: '1 day' },
    { value: '3', label: '3 days' },
    { value: '7', label: '1 week' },
    { value: '30', label: '1 month' },
  ];

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const { user } = useAuth();

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate form
  if (!question.trim()) {
    setError('Please enter a question');
    return;
  }

  const validOptions = options.filter(opt => opt.trim() !== '');
  if (validOptions.length < 2) {
    setError('Please add at least 2 options');
    return;
  }

  try {
    setIsSubmitting(true);
    setError('');
    
    // Calculate expiration date
    const expiresAt = addDays(new Date(), parseInt(expiresIn));
    
    const pollData = {
      question,
      description: description.trim(),
      options: validOptions.map(option => ({ 
        text: option,
        voters: [] // Initialize empty voters array
      })),
      expiresAt: expiresAt.toISOString(),
      tags: [],
      totalVotes: 0
    };

    console.log('Sending poll data:', JSON.stringify(pollData, null, 2));

    const response = await api.post('/polls', pollData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.data) {
      onPollCreated?.(response.data);
      // Reset form
      setQuestion('');
      setDescription('');
      setOptions(['', '']);
      setExpiresIn('1');
    }
  } catch (err) {
    console.error('Error creating poll:', err);
    console.error('Error response:', err.response?.data);
    setError(err.response?.data?.message || 'Failed to create poll. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
      <Box display="flex" alignItems="center" mb={2}>
        <Avatar />
        <Typography variant="h6" sx={{ ml: 1, fontWeight: 500 }}>Create a Poll</Typography>
      </Box>
      
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          variant="outlined"
          label="Poll Question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          margin="normal"
          required
          sx={{ mb: 2 }}
        />
        
        <TextField
          fullWidth
          variant="outlined"
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          margin="normal"
          multiline
          rows={2}
          sx={{ mb: 2 }}
        />
        
        <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
          <InputLabel id="expires-in-label">Expires in</InputLabel>
          <Select
            labelId="expires-in-label"
            value={expiresIn}
            label="Expires in"
            onChange={(e) => setExpiresIn(e.target.value)}
          >
            {expirationOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>When should this poll close?</FormHelperText>
        </FormControl>
        
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Options:</Typography>
        
        {options.map((option, index) => (
          <Box key={index} display="flex" alignItems="center" mb={1}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(e) => handleOptionChange(index, e.target.value)}
              sx={{ flexGrow: 1 }}
              required={index < 2}
            />
            {options.length > 2 && (
              <IconButton 
                size="small" 
                onClick={() => handleRemoveOption(index)}
                sx={{ ml: 1 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        ))}
        
        {options.length < 5 && (
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddOption}
            size="small"
            sx={{ mt: 1 }}
          >
            Add Option
          </Button>
        )}
        
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
        
        <Box display="flex" justifyContent="space-between" mt={3}>
          <Button 
            onClick={onCancel}
            variant="outlined"
            disabled={isSubmitting}
            sx={{ mr: 1, borderRadius: '20px', px: 3 }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={isSubmitting}
            sx={{ borderRadius: '20px', px: 3, textTransform: 'none' }}
          >
            {isSubmitting ? 'Creating...' : 'Create Poll'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default PollForm;
