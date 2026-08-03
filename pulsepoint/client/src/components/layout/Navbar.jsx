import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { FiUser, FiShield, FiLogOut, FiGlobe, FiMenu, FiX, FiActivity, FiUsers, FiBell } from 'react-icons/fi';
import axios from 'axios';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    fetchNotifications();
    // In a real app we'd attach a socket listener here for new notifications
  }, [isAuthenticated]);

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const onLogout = () => {
    logout('Logged out successfully');
    setDropdownOpen(false);
    navigate('/login');
  };

  const isAdmin = ['admin', 'moderator'].includes(user?.role);

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/95 border-b border-gray-200 backdrop-blur-md transition-all">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center h-11">
          
          {/* Left Brand Area */}
          <div className="flex items-center gap-1.5">
            <Link to="/" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <span className="text-brand-primary">
                <FiGlobe className="text-base" />
              </span>
              <span className="text-sm font-bold font-serif tracking-widest text-brand-primary uppercase">
                PulsePoint.
              </span>
            </Link>
          </div>

          {/* Center Navigation Links (Desktop) */}
          {isAuthenticated && (
          <div className="hidden md:flex items-center gap-3 flex-1 justify-center px-6">
              <Link
                to="/"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  location.pathname === '/' || location.pathname === '/home'
                    ? 'bg-brand-surface text-brand-primary border border-gray-200'
                    : 'text-text-secondary hover:text-brand-primary border border-transparent'
                }`}
              >
                <FiGlobe className="text-xs" /> Feeds
              </Link>
              <Link
                to="/communities"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  location.pathname === '/communities'
                    ? 'bg-brand-surface text-brand-primary border border-gray-200'
                    : 'text-text-secondary hover:text-brand-primary border border-transparent'
                }`}
              >
                <FiUsers className="text-xs" /> Communities
              </Link>
              
              {/* Search Bar */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const query = e.target.search.value.trim();
                  if (query) {
                    navigate(`/home?search=${encodeURIComponent(query)}`);
                  }
                }}
                className="relative ml-2 max-w-xs w-full hidden lg:block"
              >
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <FiGlobe className="text-gray-400 text-xs" />
                </div>
                <input
                  type="text"
                  name="search"
                  placeholder="Search news..."
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-brand-primary focus:bg-white transition-all text-text-primary"
                />
              </form>
            </div>
          )}

          {/* Right Controls Area (Desktop) */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* Notifications Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setNotificationsOpen(!notificationsOpen);
                      setDropdownOpen(false);
                      if (!notificationsOpen && unreadCount > 0) handleMarkAllRead();
                    }}
                    className="p-1.5 rounded-lg text-text-secondary hover:bg-gray-100 hover:text-brand-primary transition-all relative"
                  >
                    <FiBell className="text-base" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-brand-rose rounded-full border-2 border-white"></span>
                    )}
                  </button>

                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2.5 w-80 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-glass-sm animate-fade-in z-50">
                      <div className="p-3 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
                        <span className="text-sm font-bold text-text-primary">Notifications</span>
                      </div>
                      
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-text-secondary">No notifications yet.</div>
                      ) : (
                        <div className="flex flex-col">
                          {notifications.map(notif => (
                            <div key={notif._id} className={`p-3 border-b border-gray-50 flex items-start gap-3 hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-blue-50/50' : ''}`}>
                              <div className="w-8 h-8 rounded-full bg-brand-accent/10 text-brand-accent flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {notif.sender?.username?.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <p className="text-xs text-text-primary leading-snug">
                                  <span className="font-bold">{notif.sender?.username}</span> 
                                  {notif.type === 'follow' && ' started following you.'}
                                  {notif.type === 'reply' && ' replied to your comment.'}
                                </p>
                                <span className="text-[10px] text-text-muted mt-1 block">
                                  {new Date(notif.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setDropdownOpen(!dropdownOpen);
                      setNotificationsOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-gray-200 bg-brand-surface hover:bg-gray-100 transition-all focus:outline-none"
                  >
                    <div className="w-6 h-6 rounded-md bg-brand-accent/10 text-brand-accent flex items-center justify-center font-bold text-[10px]">
                      {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-text-primary pr-0.5">{user?.username}</span>
                  </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2.5 w-48 bg-white border border-gray-200 rounded-xl shadow-glass-sm overflow-hidden animate-fade-in z-50">
                    <div className="p-3 border-b border-gray-100 text-xs font-semibold text-text-secondary">
                      Signed in as <div className="text-text-primary font-bold mt-0.5 truncate">{user?.email}</div>
                    </div>
                    
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-text-secondary hover:bg-gray-50 hover:text-brand-primary transition-colors"
                    >
                      <FiUser /> Profile
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-brand-cyan hover:bg-gray-50 transition-colors"
                      >
                        <FiShield /> Moderator Panel
                      </Link>
                    )}

                    <button
                      onClick={onLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-brand-rose hover:bg-red-50 transition-colors border-t border-gray-100 text-left"
                    >
                      <FiLogOut /> Logout
                    </button>
                  </div>
                )}
              </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-text-secondary hover:text-brand-primary px-2.5 py-1.5 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-brand-accent hover:bg-brand-accentHover text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Hamburger Menu Icon (Mobile) */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-text-secondary hover:text-brand-primary p-1 rounded-lg border border-gray-200 bg-brand-surface focus:outline-none"
            >
              {isOpen ? <FiX className="text-lg" /> : <FiMenu className="text-lg" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-lg animate-fade-in p-4 flex flex-col gap-3 shadow-md">
          {isAuthenticated ? (
            <>
              <Link
                to="/"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 p-3 rounded-xl text-sm font-bold text-text-secondary hover:bg-gray-50 hover:text-brand-primary transition-all border border-transparent hover:border-gray-200"
              >
                <FiGlobe /> Feeds
              </Link>
              <Link
                to="/communities"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 p-3 rounded-xl text-sm font-bold text-text-secondary hover:bg-gray-50 hover:text-brand-primary transition-all border border-transparent hover:border-gray-200"
              >
                <FiUsers /> Communities
              </Link>
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 p-3 rounded-xl text-sm font-bold text-text-secondary hover:bg-gray-50 hover:text-brand-primary transition-all border border-transparent hover:border-gray-200"
              >
                <FiUser /> Profile Settings
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 p-3 rounded-xl text-sm font-bold text-brand-cyan hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200"
                >
                  <FiShield /> Moderator Dashboard
                </Link>
              )}
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 p-3 rounded-xl text-sm font-bold text-brand-rose hover:bg-red-50 transition-all border border-transparent hover:border-gray-200 text-left"
              >
                <FiLogOut /> Logout
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="text-center text-sm font-bold text-text-secondary hover:text-brand-primary py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setIsOpen(false)}
                className="text-center text-sm font-bold text-white bg-brand-accent hover:bg-brand-accentHover py-2.5 rounded-xl transition-all shadow-sm"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
