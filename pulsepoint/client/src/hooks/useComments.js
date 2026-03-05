import { useState } from 'react';
import axios from 'axios';

const useComments = (postId) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/community/posts/${postId}/comments`);
      setComments(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching comments');
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (commentData) => {
    try {
      setLoading(true);
      const response = await axios.post(`/api/community/posts/${postId}/comments`, commentData);
      setComments(prev => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding comment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { comments, loading, error, fetchComments, addComment };
};

export { useComments };
export default useComments;
