import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiUsers, FiMapPin, FiSend, FiMessageSquare, FiThumbsUp, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../hooks';

export default function CommunityView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newPostContent, setNewPostContent] = useState('');
  const [creating, setCreating] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ show: true, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  useEffect(() => {
    fetchCommunityData();
  }, [id]);

  const fetchCommunityData = async () => {
    setLoading(true);
    try {
      const [commRes, postsRes] = await Promise.all([
        axios.get(`/api/hub/${id}`),
        axios.get(`/api/hub/${id}/posts`)
      ]);

      if (commRes.data.success) setCommunity(commRes.data.community);
      if (postsRes.data.success) setPosts(postsRes.data.posts);
    } catch (err) {
      console.error(err);
      setError('Error loading community details');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      showToast('Please log in to join', 'error');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/hub/${id}/join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setCommunity(prev => ({
          ...prev,
          members: response.data.isMember 
            ? [...prev.members, user._id]
            : prev.members.filter(m => m !== user._id)
        }));
        showToast(response.data.isMember ? 'Joined Community!' : 'Left Community', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to join community', 'error');
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    setCreating(true);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/hub/${id}/posts`, {
        content: newPostContent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setNewPostContent('');
        setPosts([res.data.post, ...posts]);
        showToast('Posted successfully!', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error creating post', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleLike = async (postId) => {
    if (!user) return showToast('Please log in to like posts', 'error');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/community/post/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPosts(prev => prev.map(p => {
          if (p._id === postId) {
            const isLiked = p.likes.includes(user._id);
            return {
              ...p,
              likes: isLiked ? p.likes.filter(id => id !== user._id) : [...p.likes, user._id]
            };
          }
          return p;
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-brand-surface flex justify-center items-center">
      <div className="w-10 h-10 border-4 border-t-brand-primary border-r-transparent border-gray-200 rounded-full animate-spin" />
    </div>
  );

  if (error || !community) return (
    <div className="min-h-screen bg-brand-surface flex justify-center items-center">
      <p className="text-brand-rose font-bold">{error}</p>
    </div>
  );

  const isMember = community.members.includes(user?._id);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 md:px-8 bg-brand-surface min-h-screen animate-fade-in relative">
      
      {/* Toast Alert */}
      {toast.show && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-sm flex items-center gap-3 border transition-all duration-300 animate-slide-in ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-brand-rose' : 'bg-white border-gray-200 text-text-primary'
        }`}>
          <FiAlertCircle className="text-lg flex-shrink-0" />
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => navigate('/communities')}
        className="flex items-center gap-2 text-text-secondary hover:text-brand-primary text-sm font-bold mb-6 transition-all"
      >
        <FiArrowLeft /> Back to Communities
      </button>

      {/* Community Header */}
      <div className="bg-white border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-3xl p-8 md:p-10 mb-8 relative overflow-hidden">
        {community.isLocal && <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-400 to-brand-accent" />}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl md:text-4xl font-bold font-serif text-brand-primary tracking-tight">{community.name}</h1>
              <div className="flex gap-2">
                <span className="bg-gray-50 text-text-secondary border border-gray-100 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md">
                  {community.category}
                </span>
                {community.isLocal && (
                  <span className="bg-orange-50 text-brand-accent border border-orange-100 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md flex items-center gap-1">
                    <FiMapPin /> Geo-Locked
                  </span>
                )}
              </div>
            </div>
            <p className="text-text-secondary text-base leading-relaxed max-w-2xl font-medium">
              {community.description}
            </p>
          </div>

          <div className="flex items-center gap-6 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 backdrop-blur-sm">
            <div className="text-center px-4 border-r border-gray-200">
              <span className="block text-2xl font-bold text-brand-primary">{community.members.length}</span>
              <span className="text-[10px] text-text-secondary uppercase font-bold tracking-widest flex items-center gap-1 justify-center mt-1">
                <FiUsers /> Members
              </span>
            </div>
            <button
              onClick={handleJoin}
              className={`px-8 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${
                isMember 
                  ? 'bg-white border border-gray-200 text-text-secondary hover:bg-gray-50' 
                  : 'bg-brand-primary text-white hover:bg-brand-primaryHover hover:shadow'
              }`}
            >
              {isMember ? 'Joined' : 'Join Community'}
            </button>
          </div>
        </div>
      </div>

      {/* Post Composer (Only for members) */}
      {isMember ? (
        <div className="bg-white border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-2xl p-4 mb-8 transition-all focus-within:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] focus-within:border-brand-primary/30">
          <form onSubmit={handleCreatePost} className="flex gap-4 items-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <input
              type="text"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder={`Share something with ${community.name}...`}
              className="flex-1 bg-transparent border-none px-2 py-2 text-sm text-text-primary focus:outline-none focus:ring-0 placeholder-gray-400 font-medium"
            />
            <button
              type="submit"
              disabled={!newPostContent.trim() || creating}
              className="bg-brand-primary hover:bg-brand-primaryHover text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? '...' : <><FiSend className="text-xs" /> Post</>}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-gray-50/50 border border-gray-200 border-dashed rounded-2xl p-6 mb-8 text-center">
          <p className="text-sm font-bold text-text-secondary">Join this community to start posting!</p>
        </div>
      )}

      {/* Community Feed */}
      <h2 className="text-lg font-bold font-serif text-brand-primary mb-4 flex items-center gap-2">
        <FiMessageSquare /> Community Discussion
      </h2>

      {posts.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-100 rounded-3xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
          <FiMessageSquare className="text-5xl text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-text-primary">No posts yet</h3>
          <p className="text-sm text-text-secondary mt-1 font-medium">Be the first to start a conversation in {community.name}!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {posts.map((post) => {
            const hasLiked = post.likes.includes(user?._id);
            return (
              <div key={post._id} className="bg-white border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-2xl p-6 hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3.5">
                    <Link to={`/user/${post.author?._id}`} className="w-11 h-11 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center font-bold text-base text-gray-600 shadow-sm hover:opacity-80 transition-opacity">
                      {post.author?.username?.charAt(0).toUpperCase() || 'U'}
                    </Link>
                    <div>
                      <Link to={`/user/${post.author?._id}`} className="text-sm font-bold text-text-primary hover:text-brand-primary transition-colors flex items-center gap-1.5">
                        {post.author?.username || 'Resident'}
                        {post.author?.role === 'admin' && (
                          <span className="text-[9px] bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 px-2 py-0.5 rounded-full uppercase tracking-widest">Admin</span>
                        )}
                        {post.author?.role === 'journalist' && (
                          <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full uppercase tracking-widest">Journalist</span>
                        )}
                      </Link>
                      <div className="text-[11px] text-text-secondary font-medium mt-0.5">
                        {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-sm md:text-base text-text-primary leading-relaxed whitespace-pre-line mb-5 font-medium">
                  {post.content}
                </p>

                <div className="flex items-center gap-6 text-sm font-bold text-gray-400">
                  <button
                    onClick={() => handleLike(post._id)}
                    className={`flex items-center gap-2 transition-all ${
                      hasLiked ? 'text-brand-accent scale-[1.02]' : 'hover:text-brand-primary'
                    }`}
                  >
                    <FiThumbsUp className={hasLiked ? 'fill-current' : ''} /> {post.likes.length}
                  </button>
                  <Link
                    to={`/local/post/${post._id}/comments`}
                    className="flex items-center gap-2 hover:text-brand-primary transition-colors"
                  >
                    <FiMessageSquare /> {post.comments?.length || 0}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
