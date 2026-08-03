import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiUser, FiCalendar, FiShield, FiUsers, FiArrowLeft, FiActivity, FiThumbsUp, FiMessageSquare } from 'react-icons/fi';
import { useAuth } from '../hooks';

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`/api/auth/profile/${id}`);
        if (res.data.success) {
          setProfile(res.data.profile);
          setPosts(res.data.posts || []);
        }
      } catch (err) {
        setError('User not found or error loading profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  const handleFollow = async () => {
    if (!user) return navigate('/login');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/auth/${id}/follow`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setProfile(prev => ({
          ...prev,
          followers: res.data.isFollowing 
            ? [...prev.followers, user._id] 
            : prev.followers.filter(fid => fid !== user._id)
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

  if (error || !profile) return (
    <div className="min-h-screen bg-brand-surface flex justify-center items-center">
      <p className="text-brand-rose font-bold">{error}</p>
    </div>
  );

  const isSelf = user?._id === profile._id;
  const isFollowing = profile.followers.includes(user?._id);

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 md:px-8 bg-brand-surface min-h-screen animate-fade-in">
      
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-text-secondary hover:text-brand-primary text-sm font-bold mb-6 transition-all"
      >
        <FiArrowLeft /> Back
      </button>

      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          
          <div className="w-24 h-24 rounded-full bg-brand-accent/10 border-2 border-brand-accent flex items-center justify-center font-bold text-4xl text-brand-accent shadow-sm">
            {profile.username?.charAt(0).toUpperCase()}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold font-serif text-brand-primary mb-1 flex items-center justify-center md:justify-start gap-2">
              {profile.username}
              {profile.role === 'admin' && (
                <span className="text-[10px] bg-brand-cyan/10 text-brand-cyan border border-brand-cyan px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Admin
                </span>
              )}
            </h1>
            
            <p className="text-sm text-text-secondary flex items-center justify-center md:justify-start gap-2 mb-4">
              <FiCalendar /> Joined {new Date(profile.createdAt).toLocaleDateString()}
            </p>

            <div className="flex items-center justify-center md:justify-start gap-4 mb-6">
              <div className="text-center">
                <span className="block text-lg font-bold text-brand-primary">{profile.followers?.length || 0}</span>
                <span className="text-xs text-text-secondary uppercase font-bold tracking-wider">Followers</span>
              </div>
              <div className="text-center">
                <span className="block text-lg font-bold text-brand-primary">{profile.following?.length || 0}</span>
                <span className="text-xs text-text-secondary uppercase font-bold tracking-wider">Following</span>
              </div>
              <div className="text-center">
                <span className="block text-lg font-bold text-brand-accent">{profile.trustScore || 0}</span>
                <span className="text-xs text-text-secondary uppercase font-bold tracking-wider flex items-center gap-1">
                  <FiShield /> Trust Score
                </span>
              </div>
            </div>

            {!isSelf && (
              <button
                onClick={handleFollow}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                  isFollowing 
                    ? 'bg-gray-100 text-text-primary border border-gray-200 hover:bg-gray-200' 
                    : 'bg-brand-primary text-white border border-brand-primary hover:bg-brand-primaryHover'
                }`}
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            )}
            {isSelf && (
              <button
                onClick={() => navigate('/profile')}
                className="px-6 py-2 rounded-xl text-sm font-bold bg-white text-brand-primary border border-gray-200 hover:border-brand-primary transition-all shadow-sm"
              >
                Edit Profile
              </button>
            )}
          </div>

        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-bold font-serif text-text-primary mb-4 flex items-center gap-2">
          <FiActivity className="text-brand-accent" /> Recent Activity
        </h3>
        
        {posts.length === 0 ? (
          <div className="bg-white border border-gray-200 border-dashed rounded-2xl p-8 text-center text-text-secondary text-sm shadow-sm">
            No public activity yet.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map(post => (
              <div key={post._id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    {post.category} • {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                  {post.location && post.location.coordinates && (
                    <span className="text-[10px] bg-brand-accent/10 text-brand-accent border border-brand-accent/20 px-2 py-0.5 rounded-full font-bold">
                      Local Alert
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-primary font-medium leading-relaxed font-serif whitespace-pre-line">
                  {post.content}
                </p>
                <div className="mt-4 flex gap-4 text-xs font-bold text-text-secondary">
                  <span className="flex items-center gap-1.5"><FiThumbsUp /> {post.likes?.length || 0}</span>
                  <span className="flex items-center gap-1.5"><FiMessageSquare /> {post.comments?.length || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}
