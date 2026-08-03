import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks';
import axios from 'axios';
import { 
  FiAlertOctagon, FiUser, FiAward, FiCheck, FiX, FiShield,
  FiSlash, FiUsers, FiTrendingUp, FiActivity, FiAlertCircle
} from 'react-icons/fi';

export default function AdminDashboard() {
  const { user: currentUser } = useAuth();
  
  // Tab states
  const [activeTab, setActiveTab] = useState('flagged'); // 'flagged' | 'users'

  // Stats state
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    flaggedCount: 0,
    journalistCount: 0
  });
  
  // Data states
  const [flaggedPosts, setFlaggedPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ show: true, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/moderation/stats', {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFlaggedPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/moderation/flagged-posts', {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      if (response.data.success) {
        setFlaggedPosts(response.data.posts || []);
      }
    } catch (err) {
      console.error(err);
      showToast('Error fetching flagged posts queue', 'error');
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/moderation/users', {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      if (response.data.success) {
        setUsers(response.data.users || []);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading user directory', 'error');
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchFlaggedPosts(), fetchUsers()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Post moderation: Approve (keep and clear flags)
  const handleApprovePost = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(`/api/moderation/posts/${postId}/approve`, {}, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      if (response.data.success) {
        showToast('Post approved and flags dismissed', 'success');
        setFlaggedPosts(prev => prev.filter(p => p._id !== postId));
        fetchStats();
      }
    } catch (err) {
      console.error(err);
      showToast('Action failed', 'error');
    }
  };

  // Post moderation: Remove (delete completely)
  const handleRemovePost = async (postId) => {
    if (!window.confirm('Are you sure you want to permanently delete this content?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/api/moderation/posts/${postId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      if (response.data.success) {
        showToast('Flagged post permanently deleted', 'success');
        setFlaggedPosts(prev => prev.filter(p => p._id !== postId));
        fetchStats();
      }
    } catch (err) {
      console.error(err);
      showToast('Action failed', 'error');
    }
  };

  // User management: Toggle Shadow Ban
  const handleToggleShadowBan = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(`/api/moderation/users/${userId}/shadow-ban`, {}, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      if (response.data.success) {
        const isBanned = response.data.shadowBanned;
        showToast(isBanned ? 'User shadow-banned successfully' : 'User shadow-ban lifted', 'success');
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, shadowBanned: isBanned } : u));
      }
    } catch (err) {
      console.error(err);
      showToast('Action failed. Minimum Moderator role required.', 'error');
    }
  };

  // User management: Toggle Journalist verification
  const handleToggleJournalist = async (userId, isVerified) => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = isVerified 
        ? `/api/moderation/users/${userId}/revoke-journalist`
        : `/api/moderation/users/${userId}/verify-journalist`;

      const response = await axios.patch(endpoint, {}, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      
      if (response.data.success) {
        showToast(isVerified ? 'Journalist badge revoked' : 'Journalist badge verified successfully!', 'success');
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, isJournalistVerified: !isVerified } : u));
        fetchStats();
      }
    } catch (err) {
      console.error(err);
      showToast('Action failed. Administrator permissions required.', 'error');
    }
  };

  // User management: Promote/Demote User Role
  const handleChangeRole = async (userId, currentRole) => {
    const nextRole = currentRole === 'user' ? 'moderator' : currentRole === 'moderator' ? 'admin' : 'user';
    if (!window.confirm(`Change this user's role to ${nextRole.toUpperCase()}?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(`/api/moderation/users/${userId}/role`, { role: nextRole }, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      
      if (response.data.success) {
        showToast(`User role updated to ${nextRole}`, 'success');
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: nextRole } : u));
      }
    } catch (err) {
      console.error(err);
      showToast('Action failed. Administrator permissions required.', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 md:px-8 animate-fade-in relative select-none text-slate-100">
      
      {/* Toast Alert */}
      {toast.show && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-glass flex items-center gap-3 border transition-all duration-300 animate-slide-in ${
          toast.type === 'error' ? 'bg-rose-900/90 border-rose-500/30 text-rose-200' : 'bg-slate-900/90 border-brand-primary/30 text-slate-100'
        }`}>
          <FiAlertCircle className="text-lg flex-shrink-0" />
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Main title */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent font-sans">
          Moderation & Control Room
        </h1>
        <p className="text-slate-400 text-sm mt-1">Review reported geospatial bulletins and manage user safety levels.</p>
      </div>

      {/* Metrics Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        
        <div className="bg-brand-card/40 border border-brand-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
            <FiUsers className="text-lg" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-extrabold uppercase">Total Residents</div>
            <div className="text-xl font-black mt-0.5 text-slate-200">{stats.totalUsers}</div>
          </div>
        </div>

        <div className="bg-brand-card/40 border border-brand-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
            <FiActivity className="text-lg" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-extrabold uppercase">Geotagged Posts</div>
            <div className="text-xl font-black mt-0.5 text-slate-200">{stats.totalPosts}</div>
          </div>
        </div>

        <div className="bg-brand-card/40 border border-brand-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 animate-pulse">
            <FiAlertOctagon className="text-lg" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-extrabold uppercase">Flagged Content</div>
            <div className="text-xl font-black mt-0.5 text-rose-400">{stats.flaggedCount}</div>
          </div>
        </div>

        <div className="bg-brand-card/40 border border-brand-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-brand-emerald/10 border border-brand-emerald/20 flex items-center justify-center text-brand-emerald">
            <FiAward className="text-lg" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-extrabold uppercase">Verified Press</div>
            <div className="text-xl font-black mt-0.5 text-brand-emerald">{stats.journalistCount}</div>
          </div>
        </div>

      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-brand-border/60 pb-4">
        <button
          onClick={() => setActiveTab('flagged')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'flagged'
              ? 'bg-brand-primary text-white shadow-glass-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FiAlertOctagon /> Flagged Content ({flaggedPosts.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'users'
              ? 'bg-brand-primary text-white shadow-glass-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FiUsers /> User Directory ({users.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-t-brand-primary border-r-transparent border-slate-800 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="animate-fade-in">
          
          {/* Flagged Content Queue */}
          {activeTab === 'flagged' && (
            <div className="flex flex-col gap-4">
              {flaggedPosts.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-brand-border rounded-2xl bg-brand-card/20">
                  <FiCheck className="text-4xl text-brand-emerald mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-slate-300">Clean moderation queue</h3>
                  <p className="text-slate-500 text-sm mt-1">No reported geospatial posts require verification at this time.</p>
                </div>
              ) : (
                flaggedPosts.map((post) => (
                  <div 
                    key={post._id}
                    className="bg-brand-card/30 border border-brand-border rounded-2xl p-5 flex flex-col sm:flex-row justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 text-xs mb-2">
                        <span className="text-rose-400 font-extrabold uppercase flex items-center gap-1">
                          <FiAlertCircle /> Flagged {post.flaggedCount} times
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 font-semibold">Author: {post.author?.username || 'Anonymous'}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 font-semibold">Category: {post.category}</span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/20 border border-brand-border/40 p-3.5 rounded-xl whitespace-pre-line select-text">
                        {post.content}
                      </p>
                    </div>

                    <div className="flex sm:flex-col justify-end gap-2.5 flex-shrink-0">
                      <button
                        onClick={() => handleApprovePost(post._id)}
                        className="bg-brand-emerald/15 hover:bg-brand-emerald text-brand-emerald hover:text-brand-dark border border-brand-emerald/30 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 hover:scale-[1.02]"
                      >
                        <FiCheck /> Dismiss Flags
                      </button>
                      <button
                        onClick={() => handleRemovePost(post._id)}
                        className="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 hover:scale-[1.02]"
                      >
                        <FiX /> Delete Content
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* User Directory */}
          {activeTab === 'users' && (
            <div className="overflow-x-auto bg-brand-card/30 border border-brand-border rounded-2xl backdrop-blur-md">
              <table className="w-full border-collapse text-left text-xs font-semibold">
                <thead>
                  <tr className="border-b border-brand-border/60 bg-slate-950/40 text-slate-400 font-extrabold uppercase">
                    <th className="p-4">Resident</th>
                    <th className="p-4">Current Role</th>
                    <th className="p-4 text-center">Journalist Verified</th>
                    <th className="p-4 text-center">Safety Status</th>
                    <th className="p-4 text-right">Moderator Tools</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40">
                  {users.map((item) => {
                    const isSelf = item._id === currentUser?._id;
                    return (
                      <tr key={item._id} className="hover:bg-slate-900/30 transition-colors">
                        {/* Resident Info */}
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-brand-border flex items-center justify-center font-bold text-[10px] text-brand-primary">
                              {item.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-200">{item.username}</div>
                              <div className="text-[10px] text-slate-500 font-medium">{item.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Current Role */}
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-extrabold uppercase ${
                            item.role === 'admin' 
                              ? 'bg-rose-950/40 border-rose-500/30 text-rose-400'
                              : item.role === 'moderator'
                              ? 'bg-cyan-950/40 border-brand-cyan/30 text-brand-cyan'
                              : 'bg-slate-900 border-slate-700 text-slate-400'
                          }`}>
                            {item.role}
                          </span>
                        </td>

                        {/* Journalist Badge Status */}
                        <td className="p-4 text-center">
                          {item.isJournalistVerified ? (
                            <span className="text-[9px] bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/30 px-2 py-0.5 rounded-full font-extrabold">
                              VERIFIED PRESS
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-500 font-semibold">NOT VERIFIED</span>
                          )}
                        </td>

                        {/* Safety Status (Shadow Banned) */}
                        <td className="p-4 text-center">
                          {item.shadowBanned ? (
                            <span className="text-[9px] bg-rose-950/40 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-extrabold flex items-center gap-0.5 justify-center w-fit mx-auto">
                              <FiSlash className="text-[8px]" /> SHADOW BANNED
                            </span>
                          ) : (
                            <span className="text-[9px] text-brand-emerald font-extrabold flex items-center gap-0.5 justify-center">
                              <FiCheck /> GOOD STANDING
                            </span>
                          )}
                        </td>

                        {/* Moderator Tools */}
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            
                            {/* Toggle Shadow Ban */}
                            <button
                              onClick={() => handleToggleShadowBan(item._id)}
                              disabled={isSelf}
                              className={`p-1.5 rounded-lg border transition-all ${
                                item.shadowBanned
                                  ? 'bg-slate-800 border-slate-700 text-brand-cyan hover:bg-slate-700/50'
                                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white'
                              } disabled:opacity-30`}
                              title={item.shadowBanned ? "Un-ban Resident" : "Shadow Ban Resident"}
                            >
                              <FiSlash className="text-xs" />
                            </button>

                            {/* Toggle Journalist verification badge (Admin Strategy) */}
                            <button
                              onClick={() => handleToggleJournalist(item._id, item.isJournalistVerified)}
                              disabled={isSelf}
                              className={`p-1.5 rounded-lg border transition-all ${
                                item.isJournalistVerified
                                  ? 'bg-slate-800 border-slate-700 text-rose-400 hover:bg-slate-700/50'
                                  : 'bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald hover:bg-brand-emerald hover:text-brand-dark'
                              } disabled:opacity-30`}
                              title={item.isJournalistVerified ? "Revoke Press Verification" : "Verify Press Credentials"}
                            >
                              <FiAward className="text-xs" />
                            </button>

                            {/* Promot / Change Role */}
                            <button
                              onClick={() => handleChangeRole(item._id, item.role)}
                              disabled={isSelf}
                              className="p-1.5 rounded-lg border border-brand-border bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30 transition-all"
                              title="Modify Resident Access Role"
                            >
                              <FiShield className="text-xs" />
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
