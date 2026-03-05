import { useState, useEffect } from 'react';
import axios from 'axios';

const usePosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/community/posts');
      setPosts(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return { posts, loading, error, refresh: fetchPosts };
};

export { usePosts };
export default usePosts;
