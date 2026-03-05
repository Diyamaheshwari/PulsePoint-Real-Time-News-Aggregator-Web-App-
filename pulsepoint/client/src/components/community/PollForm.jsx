import React, { useState } from 'react';
import { useAuth } from '../../hooks';
import { 
  Button, 
  TextField, 
  Box, 
  Paper, 
  Typography, 
  IconButton,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const PollForm = ({ onPollCreated }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim() || options.some(opt => !opt.trim()) || options.length < 2) {
      setError('Please fill in all fields and provide at least 2 options');
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch('/api/community/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          question,
          options: options.filter(opt => opt.trim())
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create poll');
      }
      
      const newPoll = await response.json();
      onPollCreated(newPoll);
      setQuestion('');
      setOptions(['', '']);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>Create a Poll</Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Question"
          variant="outlined"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
        />
        
        <Typography variant="subtitle2" gutterBottom>Options</Typography>
        {options.map((option, index) => (
          <Box key={index} display="flex" alignItems="center" mb={1}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(e) => handleOptionChange(index, e.target.value)}
              disabled={loading}
              sx={{ mr: 1 }}
            />
            {options.length > 2 && (
              <IconButton 
                onClick={() => removeOption(index)}
                disabled={loading}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        ))}
        
        {options.length < 6 && (
          <Button 
            startIcon={<AddIcon />} 
            onClick={addOption}
            disabled={loading}
            sx={{ mb: 2 }}
          >
            Add Option
          </Button>
        )}
        
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        <Box display="flex" justifyContent="flex-end">
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={!question.trim() || options.some(opt => !opt.trim()) || loading}
          >
            {loading ? 'Creating...' : 'Create Poll'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default PollForm;
