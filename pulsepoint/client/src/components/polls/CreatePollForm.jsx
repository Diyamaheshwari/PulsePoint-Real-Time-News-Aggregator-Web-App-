import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Divider,
  Chip
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const CreatePollForm = ({ open, onClose, onPollCreated }) => {
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [expiresIn, setExpiresIn] = useState(7); // Default 7 days
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAddOption = () => {
    if (options.length < 10) {
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

  const handleAddTag = () => {
    if (tagInput.trim() && tags.length < 5) {
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    if (!question.trim()) {
      setError('Question is required');
      return;
    }
    
    const validOptions = options.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      setError('At least two options are required');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));
      
      const newPoll = {
        question: question.trim(),
        description: description.trim(),
        options: validOptions.map(opt => ({ text: opt.trim() })),
        tags,
        expiresAt: expiresAt.toISOString()
      };
      
      const response = await api.post('/polls', newPoll);
      
      if (onPollCreated) {
        onPollCreated(response.data);
      }
      
      // Reset form
      setQuestion('');
      setDescription('');
      setOptions(['', '']);
      setTags([]);
      setExpiresIn(7);
      onClose();
    } catch (err) {
      console.error('Error creating poll:', err);
      setError(err.response?.data?.message || 'Failed to create poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Create New Poll</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Typography color="error" gutterBottom>
              {error}
            </Typography>
          )}
          
          <TextField
            autoFocus
            margin="dense"
            label="Question"
            type="text"
            fullWidth
            variant="outlined"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Description (optional)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Typography variant="subtitle2" gutterBottom>
            Options (2-10)
          </Typography>
          
          {options.map((option, index) => (
            <Box key={index} display="flex" alignItems="center" mb={1}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                required={index < 2}
                sx={{ mr: 1 }}
              />
              {options.length > 2 && (
                <IconButton 
                  onClick={() => handleRemoveOption(index)}
                  size="small"
                  color="error"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}
          
          {options.length < 10 && (
            <Button
              onClick={handleAddOption}
              startIcon={<AddIcon />}
              size="small"
              sx={{ mt: 1 }}
            >
              Add Option
            </Button>
          )}
          
          <Box mt={3} mb={2}>
            <Typography variant="subtitle2" gutterBottom>
              Tags (optional)
            </Typography>
            
            <Box display="flex" alignItems="center" mb={1}>
              <TextField
                size="small"
                variant="outlined"
                placeholder="Add a tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                disabled={tags.length >= 5}
                sx={{ flexGrow: 1, mr: 1 }}
              />
              <Button 
                onClick={handleAddTag}
                disabled={!tagInput.trim() || tags.length >= 5}
                variant="outlined"
                size="small"
              >
                Add
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                />
              ))}
            </Box>
            <Typography variant="caption" color="textSecondary">
              {5 - tags.length} tags remaining
            </Typography>
          </Box>
          
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Poll Duration
            </Typography>
            <TextField
              select
              fullWidth
              variant="outlined"
              size="small"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>1 week</option>
              <option value={14}>2 weeks</option>
              <option value={30}>1 month</option>
            </TextField>
          </Box>
        </DialogContent>
        
        <Divider />
        
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Poll'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreatePollForm;
