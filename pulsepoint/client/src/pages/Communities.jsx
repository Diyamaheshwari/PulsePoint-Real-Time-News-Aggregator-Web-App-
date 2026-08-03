import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks';
import axios from 'axios';
import { 
  FiUsers, FiPlus, FiSearch, FiMapPin, FiCheck, FiNavigation, FiAlertCircle
} from 'react-icons/fi';

export default function Communities() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newComm, setNewComm] = useState({ name: '', description: '', category: 'General', isLocal: false });
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

  const fetchCommunities = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/hub?search=${search}`);
      if (response.data.success) {
        setCommunities(response.data.communities);
      }
    } catch (err) {
      console.error(err);
      showToast('Error fetching communities', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, [search]);

  const handleJoin = async (id) => {
    if (!user) {
      showToast('Please log in to join communities', 'error');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/hub/${id}/join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setCommunities(prev => prev.map(c => {
          if (c._id === id) {
            return {
              ...c,
              members: response.data.isMember 
                ? [...c.members, user._id]
                : c.members.filter(m => m !== user._id)
            };
          }
          return c;
        }));
        showToast(response.data.isMember ? 'Joined Community!' : 'Left Community', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to join community', 'error');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newComm.name || !newComm.description) return;
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const payload = { ...newComm };
      
      // Request location if local community
      if (newComm.isLocal) {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              payload.location = { latitude: position.coords.latitude, longitude: position.coords.longitude };
              await submitCreate(payload, token);
            },
            async () => {
              // Fallback to profile coordinates or default if browser geolocation blocked
              const fallbackLat = user?.location?.coordinates?.[1] || 28.6139;
              const fallbackLng = user?.location?.coordinates?.[0] || 77.2090;
              payload.location = { latitude: fallbackLat, longitude: fallbackLng };
              await submitCreate(payload, token);
            },
            { timeout: 4000 }
          );
        } else {
          const fallbackLat = user?.location?.coordinates?.[1] || 28.6139;
          const fallbackLng = user?.location?.coordinates?.[0] || 77.2090;
          payload.location = { latitude: fallbackLat, longitude: fallbackLng };
          await submitCreate(payload, token);
        }
      } else {
        await submitCreate(payload, token);
      }
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  };

  const submitCreate = async (payload, token) => {
    try {
      const response = await axios.post('/api/hub', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        showToast('Community created successfully!', 'success');
        setShowCreateModal(false);
        setNewComm({ name: '', description: '', category: 'General', isLocal: false });
        fetchCommunities();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error creating community', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 md:px-8 bg-brand-surface min-h-screen">
      
      {/* Toast Alert */}
      {toast.show && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-sm flex items-center gap-3 border transition-all duration-300 animate-slide-in ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-brand-rose' : 'bg-white border-gray-200 text-text-primary'
        }`}>
          <FiAlertCircle className="text-lg flex-shrink-0" />
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Hero Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-brand-primary">Communities Hub</h1>
          <p className="text-text-secondary mt-2">Discover and join verified local and global networks.</p>
        </div>
        
        {user && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-brand-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-brand-primaryHover transition-all shadow-sm"
          >
            <FiPlus /> Create Community
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
        <input
          type="text"
          placeholder="Search for communities or local issues..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium text-text-primary focus:outline-none focus:border-brand-primary shadow-sm transition-all"
        />
      </div>

      {/* Communities Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-t-brand-primary border-r-transparent border-gray-200 rounded-full animate-spin" />
        </div>
      ) : communities.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-gray-300 rounded-2xl">
          <FiUsers className="text-4xl text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-text-primary">No communities found</h3>
          <p className="text-sm text-text-secondary mt-1">Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map((comm) => {
            const isMember = comm.members.includes(user?._id);
            return (
              <div key={comm._id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] hover:border-gray-200 transition-all duration-300 flex flex-col relative group cursor-default">
                {comm.isLocal && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-brand-accent" />}
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col gap-1">
                    <Link to={`/community/${comm._id}`} className="text-xl font-bold font-serif text-brand-primary group-hover:text-brand-accent transition-colors">
                      {comm.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary bg-gray-50 px-2 py-0.5 rounded-md">
                        {comm.category}
                      </span>
                      {comm.isLocal && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent bg-orange-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <FiMapPin /> Local
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-text-secondary leading-relaxed mb-6 flex-1 font-medium">
                  {comm.description}
                </p>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[8px] text-gray-400 font-bold"><FiUsers /></div>
                      <div className="w-6 h-6 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-[8px] text-gray-400 font-bold">...</div>
                    </div>
                    <span className="ml-1">{comm.members.length} Members</span>
                  </div>
                  
                  <button
                    onClick={() => handleJoin(comm._id)}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isMember 
                        ? 'bg-gray-100 text-text-secondary hover:bg-gray-200' 
                        : 'bg-brand-primary text-white hover:bg-brand-primaryHover shadow-sm hover:shadow'
                    }`}
                  >
                    {isMember ? 'Joined' : 'Join'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold font-serif text-brand-primary">Create a Community</h2>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Community Name</label>
                <input
                  type="text"
                  required
                  value={newComm.name}
                  onChange={(e) => setNewComm({...newComm, name: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                  placeholder="e.g. LocalTraffic"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Description</label>
                <textarea
                  required
                  rows="3"
                  value={newComm.description}
                  onChange={(e) => setNewComm({...newComm, description: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary resize-none"
                  placeholder="What is this community about?"
                />
              </div>

              <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 p-4 rounded-xl">
                <input
                  type="checkbox"
                  id="isLocal"
                  checked={newComm.isLocal}
                  onChange={(e) => setNewComm({...newComm, isLocal: e.target.checked})}
                  className="w-4 h-4 rounded text-brand-accent focus:ring-brand-accent border-orange-300"
                />
                <label htmlFor="isLocal" className="text-sm font-bold text-brand-accent cursor-pointer flex-1">
                  Make this a Geo-Locked Local Community
                </label>
                <FiNavigation className="text-brand-accent text-lg" />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-text-secondary hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-brand-primary hover:bg-brand-primaryHover text-white px-6 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
