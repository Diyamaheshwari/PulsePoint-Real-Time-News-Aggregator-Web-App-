import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

// Helper function to handle API errors
const handleApiError = (error, defaultMessage, rejectWithValue) => {
  console.error('API Error:', {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data,
    url: error.config?.url
  });
  
  if (error.response?.status === 401) {
    // Clear auth data on 401
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    return rejectWithValue('Session expired. Please log in again.');
  }
  
  return rejectWithValue(error.response?.data?.message || defaultMessage);
};

// Async thunks
export const likePostAsync = createAsyncThunk(
  'community/likePostAsync',
  async (postId, { rejectWithValue, getState }) => {
    try {
      const response = await api.post(`/community/posts/${postId}/like`);
      return response.data.data; // Should return the updated post
    } catch (err) {
      return handleApiError(err, 'Failed to like post', rejectWithValue);
    }
  }
);

export const fetchPosts = createAsyncThunk(
  'community/fetchPosts',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Fetching thoughts from API...');
      const response = await api.get('/thoughts');
      console.log('Thoughts fetched successfully:', response.data);
      // The server returns { thoughts, currentPage, totalPages, totalThoughts }
      // We need to return just the thoughts array
      return response.data.thoughts || [];
    } catch (err) {
      console.error('Error fetching thoughts:', err);
      return handleApiError(err, 'Failed to fetch thoughts', rejectWithValue);
    }
  }
);

export const createNewPost = createAsyncThunk(
  'community/createPost',
  async (postData, { rejectWithValue, getState }) => {
    try {
      console.log('Creating new post with data:', postData);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      // Add user info to the post data
      const { auth } = getState();
      const postWithUser = {
        ...postData,
        user: auth.user?._id,
        username: auth.user?.username,
        avatar: auth.user?.avatar
      };

      const response = await api.post('/community/posts', postWithUser);
      console.log('Post created successfully:', response.data);
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to create post', rejectWithValue);
    }
  }
);
// Slice
const communitySlice = createSlice({
  name: 'community',
  initialState: {
    posts: [],
    status: 'idle',
    error: null,
    currentPost: null
  },
  reducers: {
    // Add a new post to the state
    addPost: (state, action) => {
      state.posts.unshift(action.payload);
    },
    // Like a post
    likePost: (state, action) => {
      const { postId, userId } = action.payload;
      const post = state.posts.find(p => p._id === postId);
      if (post) {
        if (!post.likes) {
          post.likes = [];
        }
        const likeIndex = post.likes.findIndex(id => id === userId);
        if (likeIndex === -1) {
          post.likes.push(userId);
        } else {
          post.likes.splice(likeIndex, 1);
        }
      }
    },
    // Update an existing post
    updatePost: (state, action) => {
      const index = state.posts.findIndex(post => post._id === action.payload._id);
      if (index !== -1) {
        state.posts[index] = action.payload;
      }
    },
    // Remove a post from the state
    removePost: (state, action) => {
      state.posts = state.posts.filter(post => post._id !== action.payload);
    },
    // Add a new comment to a post
    addComment: (state, action) => {
      const { postId, comment } = action.payload;
      const post = state.posts.find(p => p._id === postId);
      if (post) {
        if (!post.comments) {
          post.comments = [];
        }
        post.comments.unshift(comment);
      }
    },
    // Update a comment
    updateComment: (state, action) => {
      const { postId, comment } = action.payload;
      const post = state.posts.find(p => p._id === postId);
      if (post && post.comments) {
        const index = post.comments.findIndex(c => c._id === comment._id);
        if (index !== -1) {
          post.comments[index] = comment;
        }
      }
    },
    // Remove a comment
    removeComment: (state, action) => {
      const { postId, commentId } = action.payload;
      const post = state.posts.find(p => p._id === postId);
      if (post && post.comments) {
        post.comments = post.comments.filter(c => c._id !== commentId);
      }
    },
    // Update a poll
    updatePoll: (state, action) => {
      // This could be a standalone poll or a poll within a post
      const updatedPoll = action.payload;
      
      // Check if it's a post with a poll
      const postWithPoll = state.posts.find(post => 
        post.poll && post.poll._id === updatedPoll._id
      );
      
      if (postWithPoll) {
        postWithPoll.poll = updatedPoll;
      }
      
      // If you have a separate polls array, update it as well
      if (state.polls) {
        const index = state.polls.findIndex(p => p._id === updatedPoll._id);
        if (index !== -1) {
          state.polls[index] = updatedPoll;
        }
      }
    },
    // Set the current post (for post detail view)
    setCurrentPost: (state, action) => {
      state.currentPost = action.payload;
    },
    // Clear the current post
    clearCurrentPost: (state) => {
      state.currentPost = null;
    }
  },
  extraReducers: (builder) => {
    // Handle likePostAsync
    builder.addCase(likePostAsync.fulfilled, (state, action) => {
      const updatedPost = action.payload;
      const index = state.posts.findIndex(post => post._id === updatedPost._id);
      if (index !== -1) {
        state.posts[index] = updatedPost;
      }
      if (state.currentPost?._id === updatedPost._id) {
        state.currentPost = updatedPost;
      }
    });
    
    // Fetch Posts
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.posts = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to fetch posts';
        console.error('Failed to fetch posts:', action.payload);
      });
      
    // Create Post
    builder
      .addCase(createNewPost.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createNewPost.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload) {
          state.posts = [action.payload, ...state.posts];
        }
        state.error = null;
      })
      .addCase(createNewPost.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to create post';
        console.error('Failed to create post:', action.payload);
      });
  }
});

// Export actions
export const {
  addPost,
  updatePost,
  removePost,
  likePost,
  addComment,
  updateComment,
  removeComment,
  updatePoll,
  setCurrentPost,
  clearCurrentPost
} = communitySlice.actions;

// Export selectors
export const selectAllPosts = (state) => state.community.posts;
export const selectPostById = (state, postId) => 
  state.community.posts.find(post => post._id === postId);
export const selectCurrentPost = (state) => state.community.currentPost;
export const selectPostsStatus = (state) => state.community.status;
export const selectPostsError = (state) => state.community.error;

export default communitySlice.reducer;
