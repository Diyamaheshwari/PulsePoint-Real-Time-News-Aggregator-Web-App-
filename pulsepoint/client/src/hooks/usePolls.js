import { useState, useEffect } from 'react';
import axios from 'axios';

const usePolls = () => {
  const [polls, setPolls] = useState([]);
  const [dailyPoll, setDailyPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      const [pollsRes, dailyRes] = await Promise.all([
        axios.get('/api/community/polls'),
        axios.get('/api/ai-polls/today')
      ]);
      
      setPolls(pollsRes.data);
      if (dailyRes.data.polls && dailyRes.data.polls.length > 0) {
        setDailyPoll(dailyRes.data.polls[0]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching polls');
    } finally {
      setLoading(false);
    }
  };

  const voteInPoll = async (pollId, optionIndex) => {
    try {
      setLoading(true);
      const response = await axios.post(`/api/community/polls/${pollId}/vote`, { optionIndex });
      
      // Update the polls list
      setPolls(prev => 
        prev.map(poll => 
          poll._id === pollId ? response.data : poll
        )
      );
      
      // Update daily poll if this is the daily poll
      if (dailyPoll && dailyPoll._id === pollId) {
        setDailyPoll(response.data);
      }
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Error voting in poll');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  return { 
    polls, 
    dailyPoll, 
    loading, 
    error, 
    fetchPolls, 
    voteInPoll 
  };
};

export { usePolls };
export default usePolls;
