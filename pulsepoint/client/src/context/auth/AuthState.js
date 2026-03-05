import React, { useReducer, useEffect } from 'react';
import AuthContext from './authContext';
import authReducer from './authReducer';
import {
  REGISTER_SUCCESS,
  REGISTER_FAIL,
  USER_LOADED,
  AUTH_ERROR,
  LOGIN_SUCCESS,
  LOGIN_FAIL,
  LOGOUT,
  CLEAR_ERRORS,
  UPDATE_PROFILE_SUCCESS,
  UPDATE_PROFILE_FAIL
} from '../types';
import api from '../../utils/api';

const AuthState = props => {
  const initialState = {
    token: localStorage.getItem('token'),
    isAuthenticated: null,
    loading: true,
    user: null,
    error: null
  };

  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load User
  const loadUser = async () => {
    const token = localStorage.getItem('token');
    
    // If no token, don't try to load user
    if (!token) {
      dispatch({ type: AUTH_ERROR });
      return;
    }
    
    try {
      const res = await api.get('/auth/profile');
      dispatch({
        type: USER_LOADED,
        payload: res.data
      });
    } catch (err) {
      console.error('Error loading user:', err);
      // Clear invalid token
      localStorage.removeItem('token');
      dispatch({ type: AUTH_ERROR });
    }
  };

  // Load user on initial render
  useEffect(() => {
    loadUser();
  }, []);

  // Register User
  const register = async formData => {
    try {
      const res = await api.post('/auth/register', formData);

      // Store the token from the response
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      }

      dispatch({
        type: REGISTER_SUCCESS,
        payload: res.data.user || res.data
      });

      // Load user data after successful registration
      await loadUser();
    } catch (err) {
      dispatch({
        type: REGISTER_FAIL,
        payload: err.response?.data?.message || 'Registration failed'
      });
    }
  };

  // Login User
  const login = async formData => {
    try {
      const res = await api.post('/auth/login', formData);

      // Store the token from the response
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      }

      dispatch({
        type: LOGIN_SUCCESS,
        payload: res.data.user || res.data
      });

      // Load user data after successful login
      await loadUser();
    } catch (err) {
      console.error('Login error:', err);
      dispatch({
        type: LOGIN_FAIL,
        payload: err.response?.data?.message || 'Login failed'
      });
    }
  };

  // Logout
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
      // Continue with client-side logout even if server logout fails
    } finally {
      // Clear token from localStorage
      localStorage.removeItem('token');
      // Dispatch logout action to clear the state
      dispatch({ type: LOGOUT });
    }
  };

  // Clear Errors
  const clearErrors = () => dispatch({ type: CLEAR_ERRORS });

  // Update Profile
  const updateProfile = async (formData) => {
    try {
      const res = await api.put('/auth/profile', formData);
      
      dispatch({
        type: UPDATE_PROFILE_SUCCESS,
        payload: res.data.user
      });
      
      return { success: true };
    } catch (err) {
      console.error('Update profile error:', err);
      dispatch({
        type: UPDATE_PROFILE_FAIL,
        payload: err.response?.data?.message || 'Failed to update profile'
      });
      return { success: false, error: err.response?.data?.message || 'Failed to update profile' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        loading: state.loading,
        user: state.user,
        error: state.error,
        register,
        loadUser,
        login,
        logout,
        clearErrors,
        updateProfile
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
};

export default AuthState;
