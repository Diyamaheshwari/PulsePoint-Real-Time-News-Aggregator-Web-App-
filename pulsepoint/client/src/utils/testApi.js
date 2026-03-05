import api from './api';

// Test API connection and endpoints
export const testApiConnection = async () => {
  try {
    console.log('Testing API connection...');
    
    // Test posts endpoint
    console.log('Fetching posts...');
    const postsResponse = await api.get('/community/posts');
    console.log('Posts response:', {
      status: postsResponse.status,
      count: postsResponse.data?.data?.length || 0
    });
    
    // Test polls endpoint
    console.log('Fetching polls...');
    const pollsResponse = await api.get('/community/polls');
    console.log('Polls response:', {
      status: pollsResponse.status,
      count: pollsResponse.data?.data?.length || 0
    });
    
    return {
      posts: postsResponse.data?.data || [],
      polls: pollsResponse.data?.data || [],
      status: 'success'
    };
  } catch (error) {
    console.error('API Test Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      }
    });
    
    return {
      error: error.message,
      status: 'error',
      details: error.response?.data || {}
    };
  }
};

// Export the test function
window.testApiConnection = testApiConnection;
