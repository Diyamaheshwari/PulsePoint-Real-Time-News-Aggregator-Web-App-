import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiEdit3, FiSave, FiX, FiShield, FiCheckCircle, FiAlertCircle, FiSettings, FiBookmark, FiExternalLink, FiClock } from 'react-icons/fi';
import axios from 'axios';

const CATEGORIES = ['Politics', 'Technology', 'Business', 'Sports', 'Science', 'Entertainment', 'Health'];
const LANGUAGES = [
  { code: 'all', label: 'All Languages' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' }
];

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    language: 'all',
    preferences: [],
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [activeTab, setActiveTab] = useState('settings');
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        username: user.username || '',
        email: user.email || '',
        language: user.language || 'all',
        preferences: user.preferences || [],
      }));
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'bookmarks') {
      const fetchBookmarks = async () => {
        setBookmarksLoading(true);
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get('/api/users/bookmarks', {
            headers: { Authorization: token ? `Bearer ${token}` : '' }
          });
          if (response.data.success) {
            setBookmarks(response.data.bookmarks);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setBookmarksLoading(false);
        }
      };
      fetchBookmarks();
    }
  }, [activeTab]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          showToast('New passwords do not match', 'error');
          setLoading(false);
          return;
        }
        if (formData.newPassword.length < 6) {
          showToast('Password must be at least 6 characters', 'error');
          setLoading(false);
          return;
        }
        if (!formData.currentPassword) {
          showToast('Current password is required to change password', 'error');
          setLoading(false);
          return;
        }
      }

      const updateData = {
        username: formData.username,
        email: formData.email,
        language: formData.language,
        preferences: formData.preferences,
      };

      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const token = localStorage.getItem('token');
      await axios.put('/api/auth/profile', updateData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      showToast('Profile updated successfully!', 'success');
      setEditMode(false);

      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));

      if (formData.newPassword) {
        showToast('Password changed. Please log in again.', 'success');
        setTimeout(() => {
          logout('Password changed. Please sign in again.');
        }, 2000);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReporter = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/auth/verify-reporter', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        showToast(response.data.message, 'success');
        // Ideally we would update the user context here
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Verification failed', 'error');
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      language: user?.language || 'all',
      preferences: user?.preferences || [],
    });
    setEditMode(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-brand-surface flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-t-brand-primary border-r-transparent border-gray-200 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 md:px-8">

      {/* Toast */}
      {toast.show && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-sm flex items-center gap-3 border animate-slide-in ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-brand-rose' : 'bg-white border-gray-200 text-text-primary'
        }`}>
          {toast.type === 'error' ? <FiAlertCircle className="flex-shrink-0" /> : <FiCheckCircle className="flex-shrink-0 text-brand-emerald" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold font-serif text-brand-primary">Profile Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">Manage your account information and saved content.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'settings' 
              ? 'text-brand-primary border-brand-primary' 
              : 'text-text-secondary border-transparent hover:text-text-primary'
          }`}
        >
          <FiSettings /> Account Settings
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'bookmarks' 
              ? 'text-brand-primary border-brand-primary' 
              : 'text-text-secondary border-transparent hover:text-text-primary'
          }`}
        >
          <FiBookmark /> Saved Articles
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Left — Avatar Card */}
        <div className="md:col-span-1">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-center text-center gap-3 shadow-sm">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-brand-primary flex items-center justify-center text-white font-black text-3xl shadow-sm">
              {user.username?.charAt(0).toUpperCase()}
            </div>

            <div>
              <div className="text-base font-bold text-text-primary">{user.username}</div>
              <div className="text-xs text-text-secondary mt-0.5">{user.email}</div>
            </div>

            {/* Role Badge */}
            <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border flex items-center gap-1 ${
              ['admin', 'moderator'].includes(user.role)
                ? 'bg-blue-50 border-brand-primary text-brand-primary'
                : user.isJournalistVerified
                ? 'bg-emerald-50 border-brand-emerald text-brand-emerald'
                : 'bg-gray-50 border-gray-200 text-text-secondary'
            }`}>
              <FiShield className="text-[9px]" />
              {user.role === 'admin' ? 'Administrator' : user.role === 'moderator' ? 'Moderator' : user.isJournalistVerified ? 'Verified Reporter' : 'Member'}
            </span>

            {user.createdAt && (
              <div className="text-[10px] text-text-muted mt-1">
                Joined {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              </div>
            )}

            {/* Preferences Summary */}
            {user.preferences?.length > 0 && (
              <div className="w-full mt-3 pt-3 border-t border-gray-100">
                <div className="text-[10px] text-text-secondary uppercase font-bold tracking-wider mb-2">Your Topics</div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {user.preferences.slice(0, 4).map(topic => (
                    <span key={topic} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 border border-orange-100 text-brand-accent">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — Main Content */}
        <div className="md:col-span-2">
          {activeTab === 'settings' && (
            <>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            {/* Section header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <FiUser className="text-brand-primary" /> Account Details
              </h2>
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-brand-primary border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all"
                >
                  <FiEdit3 /> Edit Profile
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-text-secondary border border-gray-200 hover:bg-gray-50 transition-all"
                  >
                    <FiX /> Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primaryHover transition-all disabled:opacity-50 shadow-sm"
                  >
                    <FiSave /> {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Username</label>
                <div className="relative flex items-center">
                  <FiUser className="absolute left-3 text-gray-400" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={!editMode}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Email Address</label>
                <div className="relative flex items-center">
                  <FiMail className="absolute left-3 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!editMode}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Preferences Section — only show when editing */}
              {editMode && (
                <div className="mt-2 pt-4 border-t border-gray-100">
                  <div className="text-[10px] uppercase font-bold text-text-secondary tracking-wider mb-4">
                    News Preferences
                  </div>
                  
                  {/* Language */}
                  <div className="flex flex-col gap-1.5 mb-4">
                    <label className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Preferred Language</label>
                    <select
                      name="language"
                      value={formData.language}
                      onChange={handleChange}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Topics */}
                  <div className="flex flex-col gap-1.5 mb-4">
                    <label className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Favorite Topics</label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => {
                        const isSelected = formData.preferences.includes(cat);
                        return (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                preferences: isSelected 
                                  ? prev.preferences.filter(p => p !== cat)
                                  : [...prev.preferences, cat]
                              }));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              isSelected
                                ? 'bg-brand-primary border-brand-primary text-white shadow-sm'
                                : 'bg-white border-gray-200 text-text-secondary hover:border-gray-300 hover:text-text-primary'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Password Section — only show when editing */}
              {editMode && (
                <div className="mt-2 pt-4 border-t border-gray-100">
                  <div className="text-[10px] uppercase font-bold text-text-secondary tracking-wider mb-4">
                    Change Password <span className="normal-case font-normal text-gray-500">(leave blank to keep current)</span>
                  </div>

                  {/* Current Password */}
                  <div className="flex flex-col gap-1.5 mb-3">
                    <label className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Current Password</label>
                    <div className="relative flex items-center">
                      <FiLock className="absolute left-3 text-gray-400" />
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-10 py-2.5 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                        className="absolute right-3 text-gray-400 hover:text-text-primary"
                      >
                        {showPasswords.current ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* New Password */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">New Password</label>
                      <div className="relative flex items-center">
                        <FiLock className="absolute left-3 text-gray-400" />
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          name="newPassword"
                          value={formData.newPassword}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-10 py-2.5 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                          className="absolute right-3 text-gray-400 hover:text-text-primary"
                        >
                          {showPasswords.new ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Confirm Password</label>
                      <div className="relative flex items-center">
                        <FiLock className="absolute left-3 text-gray-400" />
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-10 py-2.5 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                          className="absolute right-3 text-gray-400 hover:text-text-primary"
                        >
                          {showPasswords.confirm ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Preferences / Stats card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mt-4">
            <h2 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
              <FiShield className="text-brand-accent" /> Account Info
            </h2>
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-text-secondary font-semibold">Account Role</span>
                <span className="text-text-primary font-bold capitalize">{user.role}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-text-secondary font-semibold">Onboarding Status</span>
                <span className={`font-bold flex items-center gap-1 ${user.onboardingCompleted ? 'text-brand-emerald' : 'text-orange-500'}`}>
                  <FiCheckCircle /> {user.onboardingCompleted ? 'Completed' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-text-secondary font-semibold">Local Radius</span>
                <span className="text-brand-primary font-bold">{user.radius || 10} km</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-text-secondary font-semibold">Preferred Language</span>
                <span className="text-text-primary font-bold uppercase">{user.preferences?.language || 'EN'}</span>
              </div>
            </div>

            {!user.isJournalistVerified && user.role !== 'admin' && (
              <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                <button
                  onClick={handleVerifyReporter}
                  className="w-full bg-brand-surface border border-gray-200 hover:border-brand-primary text-text-primary px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex justify-center items-center gap-2 hover:bg-gray-50"
                >
                  <FiCheckCircle className="text-brand-emerald" /> Apply for Verified Reporter
                </button>
                <p className="text-[10px] text-text-muted mt-2">
                  Requires a Trust Score of 50 or higher.
                </p>
              </div>
            )}
          </div>
          </>
          )}

          {activeTab === 'bookmarks' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-text-primary mb-6 flex items-center gap-2">
                <FiBookmark className="text-brand-primary" /> Saved For Later
              </h2>
              
              {bookmarksLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-t-brand-primary border-r-transparent border-gray-200 rounded-full animate-spin" />
                </div>
              ) : bookmarks.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-300 rounded-xl bg-gray-50">
                  <FiBookmark className="text-3xl text-gray-300 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-text-primary">No saved articles yet</h3>
                  <p className="text-xs text-text-secondary mt-1">Articles you bookmark will appear here.</p>
                  <button onClick={() => navigate('/home')} className="mt-4 text-xs font-bold text-brand-primary hover:underline">Explore News</button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {bookmarks.map(article => (
                    <a key={article._id} href={`/news/article/${article._id}`} className="group block bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-white hover:border-gray-300 transition-all shadow-sm">
                      <div className="flex gap-4">
                        {article.urlToImage && (
                          <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden hidden sm:block">
                            <img src={article.urlToImage} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          </div>
                        )}
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-accent/10 text-brand-accent">{article.category}</span>
                              <span className="text-[10px] text-text-secondary flex items-center gap-1"><FiClock /> {new Date(article.publishedAt).toLocaleDateString()}</span>
                            </div>
                            <h3 className="text-sm font-bold font-serif text-brand-primary leading-snug group-hover:text-brand-accent transition-colors line-clamp-2">
                              {article.title}
                            </h3>
                          </div>
                          <div className="flex justify-end mt-2">
                            <span className="text-xs font-bold text-text-secondary group-hover:text-brand-primary flex items-center gap-1">Read <FiExternalLink /></span>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
