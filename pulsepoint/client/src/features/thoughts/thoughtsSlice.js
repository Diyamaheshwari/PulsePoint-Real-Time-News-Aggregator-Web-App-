import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../utils/api';

// Async thunks
export const fetchThoughts = createAsyncThunk(
  'thoughts/fetchThoughts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/thoughts');
      return response.data.thoughts;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch thoughts');
    }
  }
);

export const createThought = createAsyncThunk(
  'thoughts/createThought',
  async (content, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/thoughts', { content });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create thought');
    }
  }
);

export const updateThought = createAsyncThunk(
  'thoughts/updateThought',
  async ({ id, content }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/thoughts/${id}`, { content });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update thought');
    }
  }
);

export const deleteThought = createAsyncThunk(
  'thoughts/deleteThought',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/thoughts/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete thought');
    }
  }
);

export const likeThought = createAsyncThunk(
  'thoughts/likeThought',
  async (thoughtId, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const response = await api.post(`/api/thoughts/${thoughtId}/like`, { userId: auth.user?._id });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to like thought');
    }
  }
);

export const dislikeThought = createAsyncThunk(
  'thoughts/dislikeThought',
  async (thoughtId, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const response = await api.post(`/api/thoughts/${thoughtId}/dislike`, { userId: auth.user?._id });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to dislike thought');
    }
  }
);

export const addComment = createAsyncThunk(
  'thoughts/addComment',
  async ({ thoughtId, content }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/thoughts/${thoughtId}/comments`, { content });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add comment');
    }
  }
);

const thoughtsSlice = createSlice({
  name: 'thoughts',
  initialState: {
    thoughts: [],
    loading: false,
    error: null,
    currentPage: 1,
    totalPages: 1,
    totalThoughts: 0
  },
  reducers: {
    // Handle real-time updates from WebSocket
    newThoughtReceived: (state, action) => {
      // Add new thought at the beginning of the array
      state.thoughts.unshift(action.payload);
      state.totalThoughts += 1;
    },
    thoughtUpdated: (state, action) => {
      const index = state.thoughts.findIndex(t => t._id === action.payload._id);
      if (index !== -1) {
        state.thoughts[index] = action.payload;
      }
    },
    thoughtDeleted: (state, action) => {
      state.thoughts = state.thoughts.filter(t => t._id !== action.payload);
      state.totalThoughts = Math.max(0, state.totalThoughts - 1);
    },
    clearError: (state) => {
      state.error = null;
    },
    resetThoughts: (state) => {
      state.thoughts = [];
      state.loading = false;
      state.error = null;
      state.currentPage = 1;
      state.totalPages = 1;
      state.totalThoughts = 0;
    },
    // Optimistically update likes/dislikes in the UI
    updateThoughtLikes: (state, action) => {
      const { thoughtId, userId, actionType } = action.payload;
      const thought = state.thoughts.find(t => t._id === thoughtId);
      
      if (thought) {
        if (actionType === 'like') {
          // If already liked, unlike it
          const likeIndex = thought.likes.indexOf(userId);
          if (likeIndex !== -1) {
            thought.likes.splice(likeIndex, 1);
          } else {
            // Remove from dislikes if exists
            const dislikeIndex = thought.dislikes?.indexOf(userId);
            if (dislikeIndex !== -1) {
              thought.dislikes.splice(dislikeIndex, 1);
            }
            // Add to likes
            thought.likes.push(userId);
          }
        } else if (actionType === 'dislike') {
          // If already disliked, undislike it
          const dislikeIndex = thought.dislikes?.indexOf(userId);
          if (dislikeIndex !== -1) {
            thought.dislikes.splice(dislikeIndex, 1);
          } else {
            // Remove from likes if exists
            const likeIndex = thought.likes.indexOf(userId);
            if (likeIndex !== -1) {
              thought.likes.splice(likeIndex, 1);
            }
            // Add to dislikes
            thought.dislikes = thought.dislikes || [];
            thought.dislikes.push(userId);
          }
        }
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch thoughts
    builder.addCase(fetchThoughts.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchThoughts.fulfilled, (state, action) => {
      state.loading = false;
      state.thoughts = action.payload.thoughts || [];
      state.currentPage = action.payload.currentPage || 1;
      state.totalPages = action.payload.totalPages || 1;
      state.totalThoughts = action.payload.totalThoughts || 0;
    });
    builder.addCase(fetchThoughts.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to fetch thoughts';
    });

    // Create thought
    builder.addCase(createThought.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createThought.fulfilled, (state, action) => {
      state.loading = false;
      state.thoughts.unshift(action.payload);
      state.totalThoughts += 1;
    });
    builder.addCase(createThought.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to create thought';
    });

    // Like thought
    builder.addCase(likeThought.pending, (state, action) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(likeThought.fulfilled, (state, action) => {
      state.loading = false;
      const index = state.thoughts.findIndex(t => t._id === action.payload._id);
      if (index !== -1) {
        state.thoughts[index] = action.payload;
      }
    });
    builder.addCase(likeThought.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to like thought';
    });

    // Dislike thought
    builder.addCase(dislikeThought.pending, (state, action) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(dislikeThought.fulfilled, (state, action) => {
      state.loading = false;
      const index = state.thoughts.findIndex(t => t._id === action.payload._id);
      if (index !== -1) {
        state.thoughts[index] = action.payload;
      }
    });
    builder.addCase(dislikeThought.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to dislike thought';
    });
  },
});

// Export the new action creator
export const { updateThoughtLikes } = thoughtsSlice.actions;

export const { 
  newThoughtReceived, 
  thoughtUpdated, 
  thoughtDeleted, 
  clearError,
  resetThoughts
} = thoughtsSlice.actions;

export default thoughtsSlice.reducer;
