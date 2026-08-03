import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { selectIsAuthenticated, selectCurrentUser } from '../features/auth/authSlice';

const CommunityContext = createContext();

const initialState = {
  posts: [],
  activePolls: [],
  dailyPoll: null,
  loading: false,
  error: null,
  hasMore: true,
  page: 1,
  limit: 10
};

const communityReducer = (state, action) => {
  switch (action.type) {
    case 'CLEAR_ERRORS':
      return { ...state, error: null };
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_POSTS_SUCCESS': {
      const incomingPosts = Array.isArray(action.payload) 
        ? action.payload 
        : (action.payload?.posts || action.payload?.data || []);
      return {
        ...state,
        loading: false,
        posts: [...state.posts, ...incomingPosts],
        hasMore: incomingPosts.length === state.limit,
        page: incomingPosts.length === state.limit ? state.page + 1 : state.page
      };
    }
    case 'FETCH_POLLS_SUCCESS': {
      const incomingPolls = Array.isArray(action.payload) 
        ? action.payload 
        : (action.payload?.polls || action.payload?.data || []);
      return {
        ...state,
        loading: false,
        activePolls: incomingPolls
      };
    }
    case 'FETCH_DAILY_POLL_SUCCESS':
      return {
        ...state,
        loading: false,
        dailyPoll: action.payload || null
      };
    case 'ADD_POST':
      return {
        ...state,
        posts: [action.payload, ...state.posts]
      };
    case 'ADD_COMMENT':
      return {
        ...state,
        posts: state.posts.map(post => 
          post._id === action.payload.postId
            ? { ...post, comments: [action.payload.comment, ...post.comments] }
            : post
        )
      };
    case 'TOGGLE_LIKE':
      return {
        ...state,
        posts: state.posts.map(post => {
          if (post._id === action.payload.id) {
            const isLiked = post.likes.includes(action.payload.userId);
            return {
              ...post,
              likes: isLiked
                ? post.likes.filter(id => id !== action.payload.userId)
                : [...post.likes, action.payload.userId],
              likeCount: isLiked ? post.likeCount - 1 : post.likeCount + 1
            };
          }
          return post;
        })
      };
    case 'VOTE_POLL':
      return {
        ...state,
        activePolls: state.activePolls.map(poll => 
          poll._id === action.payload.pollId
            ? { ...poll, ...action.payload.updatedPoll }
            : poll
        ),
        dailyPoll: state.dailyPoll?._id === action.payload.pollId
          ? { ...state.dailyPoll, ...action.payload.updatedPoll }
          : state.dailyPoll
      };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'RESET_POSTS':
      return { ...state, posts: [], page: 1, hasMore: true };
    default:
      return state;
  }
};

export const CommunityProvider = ({ children }) => {
  const [state, dispatch] = useReducer(communityReducer, initialState);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);
  const token = localStorage.getItem('token');

  // Fetch posts
  const fetchPosts = async (page = 1, limit = 10) => {
    try {
      dispatch({ type: 'FETCH_START' });
      const response = await axios.get(`/api/community/posts?page=${page}&limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      dispatch({ 
        type: 'FETCH_POSTS_SUCCESS', 
        payload: response.data.data 
      });
    } catch (err) {
      dispatch({ 
        type: 'FETCH_ERROR', 
        payload: err.response?.data?.message || 'Failed to fetch posts' 
      });
    }
  };

  // Fetch active polls
  const fetchActivePolls = async () => {
    try {
      dispatch({ type: 'FETCH_START' });
      const response = await axios.get('/api/community/polls');
      dispatch({ 
        type: 'FETCH_POLLS_SUCCESS', 
        payload: response.data.data 
      });
    } catch (err) {
      dispatch({ 
        type: 'FETCH_ERROR', 
        payload: err.response?.data?.message || 'Failed to fetch polls' 
      });
    }
  };

  // Fetch daily poll
  const fetchDailyPoll = async () => {
    try {
      dispatch({ type: 'FETCH_START' });
      const response = await axios.get('/api/community/polls/daily');
      dispatch({ 
        type: 'FETCH_DAILY_POLL_SUCCESS', 
        payload: response.data.data 
      });
    } catch (err) {
      console.error('Error fetching daily poll:', err);
    }
  };

  // Create a new post
  const createPost = async (postData) => {
    try {
      const response = await axios.post('/api/community/posts', postData);
      dispatch({ 
        type: 'ADD_POST', 
        payload: response.data.data 
      });
      return { success: true };
    } catch (err) {
      dispatch({ 
        type: 'FETCH_ERROR', 
        payload: err.response?.data?.message || 'Failed to create post' 
      });
      return { success: false, error: err.response?.data?.message };
    }
  };

  // Add a comment to a post
  const addComment = async (postId, content) => {
    try {
      const response = await axios.post(`/api/community/posts/${postId}/comments`, { content });
      dispatch({
        type: 'ADD_COMMENT',
        payload: {
          postId,
          comment: response.data.data
        }
      });
      return { success: true };
    } catch (err) {
      dispatch({
        type: 'FETCH_ERROR',
        payload: err.response?.data?.message || 'Failed to add comment'
      });
      return { success: false, error: err.response?.data?.message };
    }
  };

  // Toggle like on a post or comment
  const toggleLike = async (type, id) => {
    try {
      await axios.post(`/api/community/${type}/${id}/like`);
      dispatch({
        type: 'TOGGLE_LIKE',
        payload: {
          id,
          userId: user?._id
        }
      });
      return { success: true };
    } catch (err) {
      dispatch({
        type: 'FETCH_ERROR',
        payload: err.response?.data?.message || 'Failed to toggle like'
      });
      return { success: false, error: err.response?.data?.message };
    }
  };

  // Vote in a poll
  const voteInPoll = async (pollId, optionIndex) => {
    try {
      const response = await axios.post(`/api/community/polls/${pollId}/vote`, { optionIndex });
      dispatch({
        type: 'VOTE_POLL',
        payload: {
          pollId,
          updatedPoll: response.data.data
        }
      });
      return { success: true };
    } catch (err) {
      dispatch({
        type: 'FETCH_ERROR',
        payload: err.response?.data?.message || 'Failed to submit vote'
      });
      return { success: false, error: err.response?.data?.message };
    }
  };

  // Load more posts
  const loadMorePosts = () => {
    if (state.hasMore && !state.loading) {
      fetchPosts(state.page, state.limit);
    }
  };

  // Clear errors
  const clearErrors = () => {
    dispatch({ type: 'CLEAR_ERRORS' });
  };

  // Reset posts
  const resetPosts = () => {
    dispatch({ type: 'RESET_POSTS' });
  };

  // Initial data fetch
  useEffect(() => {
    resetPosts();
    fetchPosts(1, state.limit);
    fetchActivePolls();
    fetchDailyPoll();
  }, []);

  return (
    <CommunityContext.Provider
      value={{
        ...state,
        fetchPosts,
        fetchActivePolls,
        fetchDailyPoll,
        createPost,
        addComment,
        toggleLike,
        voteInPoll,
        loadMorePosts,
        resetPosts,
        clearErrors
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
};

export const useCommunity = () => {
  const context = useContext(CommunityContext);
  if (context === undefined) {
    throw new Error('useCommunity must be used within a CommunityProvider');
  }
  return context;
};