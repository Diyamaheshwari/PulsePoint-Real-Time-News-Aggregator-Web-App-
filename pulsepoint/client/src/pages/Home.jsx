import React, { useState, useEffect, useRef } from 'react';
import { useAuth, useGeolocation, useSocket } from '../hooks';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { 
  FiGlobe, FiMap, FiHeart, FiMessageSquare, FiFlag, FiCpu, 
  FiTrendingUp, FiThumbsUp, FiAlertCircle, FiPlus, FiNavigation,
  FiShare2, FiTwitter, FiCheckCircle, FiUsers, FiSearch, FiBookmark
} from 'react-icons/fi';

const CATEGORIES = ['all', 'General', 'Technology', 'Sports', 'Business', 'Entertainment', 'Health', 'Science'];
const LOCAL_CATEGORIES = ['Alert', 'Event', 'Discussion', 'Lost&Found'];

// Fallback date range (overridden by API response)
const todayStr = new Date().toISOString().slice(0, 10);
const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const NEWS_MIN_DATE = thirtyDaysAgoStr;
const NEWS_MAX_DATE = todayStr;
const NEWS_DATE_LABEL = `${new Date(NEWS_MIN_DATE).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${new Date(NEWS_MAX_DATE).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [feedType, setFeedType] = useState('global'); // 'global' | 'local' | 'following'
  
  // Extract search from URL
  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get('search') || '';
  
  // Geolocation for local feed
  const { coordinates, error: geoError, loading: geoLoading } = useGeolocation();
  
  // Feed states
  const [globalArticles, setGlobalArticles] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('global');
  
  const [localPosts, setLocalPosts] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [localCategory, setLocalCategory] = useState('all');  const [followingPosts, setFollowingPosts] = useState([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [networkUsers, setNetworkUsers] = useState({ followingUsers: [], suggestedUsers: [] });
  const [networkLoading, setNetworkLoading] = useState(false);
  
  // New post state
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('General');
  const [newPostAnon, setNewPostAnon] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);
  
  // Notification / Alert state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const toastTimeoutRef = useRef(null);
  
  // Bookmarks
  const [bookmarkedArticleIds, setBookmarkedArticleIds] = useState([]);

  // Dynamic date range from DB
  const [dateRange, setDateRange] = useState({ min: NEWS_MIN_DATE, max: NEWS_MAX_DATE, label: NEWS_DATE_LABEL });

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ show: true, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const handleNewLocalPost = (newPost) => {
    setLocalPosts((prev) => {
      if (prev.some((p) => p._id === newPost._id)) return prev;
      
      let postWithDist = { ...newPost };
      if (coordinates && newPost.location?.coordinates?.length === 2) {
        const [pLng, pLat] = newPost.location.coordinates;
        const distKm = haversineDistance(coordinates.latitude, coordinates.longitude, pLat, pLng);
        postWithDist.distance = Math.round(distKm * 100) / 100;
        postWithDist.distanceLabel = distKm < 1 ? `${Math.round(distKm * 1000)}m away` : `${distKm.toFixed(1)}km away`;
      } else {
        postWithDist.distanceLabel = 'Nearby';
      }
      return [postWithDist, ...prev];
    });
    showToast('New local alert posted nearby!', 'info');
  };

  useSocket({
    newLocalPost: handleNewLocalPost,
  });

  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const fetchGlobalFeed = async () => {
    setGlobalLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (selectedCategory && selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedCountry && selectedCountry !== 'global') params.country = selectedCountry;
      if (selectedDate) params.date = selectedDate;
      if (searchQuery) params.search = searchQuery;
        
      const response = await axios.get('/api/news/feed', { 
        params,
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      if (response.data.success) {
        setGlobalArticles(response.data.articles || []);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load global news feed', 'error');
    } finally {
      setGlobalLoading(false);
    }
  };

  const fetchLocalFeed = async (category = localCategory) => {
    setLocalLoading(true);
    try {
      const token = localStorage.getItem('token');
      const latVal = coordinates?.latitude;
      const lngVal = coordinates?.longitude;
      
      if (!latVal || !lngVal) {
        setLocalLoading(false);
        return;
      }

      const categoryParam = category !== 'all' ? `&category=${category}` : '';
      const response = await axios.get(
        `/api/local/feed?lat=${latVal}&lng=${lngVal}&radius=${user?.radius || 20}${categoryParam}`,
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );
      if (response.data.success) {
        setLocalPosts(response.data.posts || []);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load local feed. Please grant location access.', 'error');
    } finally {
      setLocalLoading(false);
    }
  };

  const fetchFollowingFeed = async () => {
    if (!isAuthenticated) return;
    setFollowingLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/local/following', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setFollowingPosts(response.data.posts || []);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load following feed', 'error');
    } finally {
      setFollowingLoading(false);
    }
  };

  const fetchNetworkUsers = async () => {
    if (!isAuthenticated) return;
    setNetworkLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/auth/network-users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setNetworkUsers({
          followingUsers: response.data.followingUsers || [],
          suggestedUsers: response.data.suggestedUsers || []
        });
      }
    } catch (err) {
      console.error('Failed to load network users:', err);
    } finally {
      setNetworkLoading(false);
    }
  };

  const handleToggleFollowUser = async (targetId) => {
    if (!isAuthenticated) return showToast('Please log in to follow users', 'error');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/auth/follow/${targetId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        showToast(response.data.isFollowing ? 'Followed user!' : 'Unfollowed user', 'success');
        fetchNetworkUsers();
        fetchFollowingFeed();
      }
    } catch (err) {
      showToast('Failed to update follow status', 'error');
    }
  };

  useEffect(() => {
    if (feedType === 'global') fetchGlobalFeed();
  }, [selectedCategory, selectedCountry, selectedDate, feedType, searchQuery]);
  
  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!isAuthenticated) return;
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/users/bookmarks', {
          headers: { Authorization: token ? `Bearer ${token}` : '' }
        });
        if (response.data.success) {
          setBookmarkedArticleIds(response.data.bookmarks.map(b => b._id || b));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchBookmarks();
  }, [isAuthenticated]);

  useEffect(() => {
    if (feedType === 'local' && coordinates) fetchLocalFeed();
  }, [coordinates, localCategory, feedType]);

  useEffect(() => {
    // Fetch actual date range from the news DB so we can guide the user
    axios.get('/api/news/date-range').then(res => {
      if (res.data.success && res.data.minDate && res.data.maxDate) {
        const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        setDateRange({
          min: res.data.minDate,
          max: res.data.maxDate,
          label: `${fmt(res.data.minDate)} – ${fmt(res.data.maxDate)}`
        });
      }
    }).catch(() => {}); // silently fail, fallback to constants
  }, []);

  useEffect(() => {
    if (feedType === 'following' && isAuthenticated) {
      fetchFollowingFeed();
      fetchNetworkUsers();
    }
  }, [feedType, isAuthenticated]);

  const handleLikePost = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/local/post/${postId}/like`, {}, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      if (response.data.success) {
        setLocalPosts((prev) =>
          prev.map((p) => {
            if (p._id === postId) {
              const hasLiked = p.likes.includes(user?._id);
              return {
                ...p,
                likes: hasLiked
                  ? p.likes.filter((id) => id !== user?._id)
                  : [...p.likes, user?._id],
              };
            }
            return p;
          })
        );
      }
    } catch (err) {
      console.error(err);
      showToast('Log in to like posts', 'error');
    }
  };

  const handleFlagPost = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/local/post/${postId}/flag`, {}, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      if (response.data.success) {
        showToast('Post flagged and sent to moderator queue', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Error flagging post', 'error');
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    if (!coordinates) {
      showToast('Location coordinate required to post locally. Enable GPS.', 'error');
      return;
    }

    setCreatingPost(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/local/post',
        {
          content: newPostContent,
          category: newPostCategory,
          isAnonymous: newPostAnon,
          lat: coordinates.latitude,
          lng: coordinates.longitude,
        },
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );

      if (response.data.success) {
        setNewPostContent('');
        showToast('Successfully published local report!', 'success');
        const newP = response.data.post;
        setLocalPosts((prev) => {
          if (prev.some((p) => p._id === newP._id)) return prev;
          const distKm = haversineDistance(coordinates.latitude, coordinates.longitude, newP.location.coordinates[1], newP.location.coordinates[0]);
          return [{
            ...newP,
            distance: distKm,
            distanceLabel: distKm < 1 ? `${Math.round(distKm * 1000)}m away` : `${distKm.toFixed(1)}km away`
          }, ...prev];
        });
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Error creating post', 'error');
    } finally {
      setCreatingPost(false);
    }
  };

  const shareNative = (title, url) => {
    if (navigator.share) {
      navigator.share({ title, url }).catch(console.error);
    } else {
      const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
      window.open(shareUrl, '_blank');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-4 px-4 md:px-6 select-none bg-brand-surface min-h-screen">
      
      {/* Toast Alert */}
      {toast.show && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-glass flex items-center gap-3 border transition-all duration-300 animate-slide-in ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-brand-rose' : 
          toast.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-700' :
          'bg-white border-gray-200 text-text-primary'
        }`}>
          <FiAlertCircle className="text-lg flex-shrink-0" />
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Hero Welcome banner */}
      <div className="relative mb-5 rounded-xl p-5 overflow-hidden bg-white border border-brand-border">
        <div className="absolute top-[-50%] right-[-10%] w-[40%] h-[200%] bg-brand-primary/5 blur-[80px] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 z-10 relative">
          <div>
            <h1 className="text-lg md:text-xl font-bold font-serif text-brand-primary flex items-center gap-2">
              Welcome back, <span className="text-brand-accent">{user?.username || 'Guest'}</span>
            </h1>
            <p className="text-text-secondary text-xs mt-0.5">Stay informed with the latest from around the world.</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg">
            <FiTrendingUp className="text-brand-accent text-base" />
            <div className="text-xs">
              <div className="font-semibold text-text-primary">Radar Active</div>
              <div className="text-brand-primary font-medium mt-0.5">{user?.radius || 10} km coverage</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feed Toggle Controls */}
      <div className="flex justify-between items-center mb-5 gap-3 border-b border-gray-200 pb-3">
        <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg border border-gray-200">
          <button
            onClick={() => setFeedType('global')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
              feedType === 'global'
                ? 'bg-white text-brand-primary shadow-sm border border-gray-200'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <FiGlobe className="text-xs" /> Global Feed
          </button>
          <button
            onClick={() => setFeedType('local')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
              feedType === 'local'
                ? 'bg-white text-brand-primary shadow-sm border border-gray-200'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <FiMap className="text-xs" /> Nearby Buzz
          </button>
          {isAuthenticated && (
            <button
              onClick={() => setFeedType('following')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                feedType === 'following'
                  ? 'bg-white text-brand-primary shadow-sm border border-gray-200'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <FiUsers className="text-xs" /> Following
            </button>
          )}
        </div>
        
        {feedType === 'global' && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest hidden sm:block">Date:</span>
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white border border-gray-200 text-brand-primary text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-primary cursor-pointer hover:border-gray-300 transition-colors"
                min={dateRange.min}
                max={dateRange.max}
              />
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest hidden sm:block">Region:</span>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="bg-white border border-gray-200 text-brand-primary text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-primary cursor-pointer hover:border-gray-300 transition-colors"
              >
                <option value="global">All Countries</option>
                <option value="us">United States</option>
                <option value="in">India</option>
                <option value="gb">United Kingdom</option>
                <option value="au">Australia</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Date input: clamp min/max to actual data range */}

      {/* ================= GLOBAL FEED ================= */}
      {feedType === 'global' && (
        <div className="animate-fade-in">
          {/* Date availability hint - always show when on global feed */}
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-text-muted">
              📅 News available: <span className="font-semibold text-text-secondary">{dateRange.label}</span>
            </span>
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="text-[10px] font-bold text-brand-accent hover:underline"
              >
                ✕ Clear date
              </button>
            )}
          </div>
          {/* Category Slider */}
          {searchQuery && (
            <div className="mb-3 flex items-center gap-2 text-brand-primary bg-white px-3 py-1.5 rounded-lg border border-gray-200 w-max">
              <FiSearch className="text-brand-accent text-xs" />
              <span className="text-xs font-semibold">Results for: <span className="text-brand-accent">"{searchQuery}"</span></span>
            </div>
          )}
          <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all border ${
                  selectedCategory === cat
                    ? 'bg-brand-primary border-brand-primary text-white'
                    : 'bg-white border-gray-200 text-text-secondary hover:border-gray-300 hover:text-text-primary'
                }`}
              >
                {cat === 'all' ? 'Featured For You' : cat}
              </button>
            ))}
          </div>

          {globalLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-10 h-10 border-4 border-t-brand-primary border-r-transparent border-gray-200 rounded-full animate-spin" />
            </div>
          ) : globalArticles.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-300 rounded-xl bg-white">
              <FiGlobe className="text-3xl text-gray-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-text-primary mb-1">
                {selectedDate ? `No articles found for ${selectedDate}` : 'No articles available'}
              </h3>
              {selectedDate ? (
                <>
                  <p className="text-text-secondary text-xs mt-1">
                    The news database has articles from:
                  </p>
                  <div className="inline-flex items-center gap-2 mt-2 bg-brand-primary/5 border border-brand-primary/20 px-4 py-2 rounded-lg">
                    <span className="text-brand-primary font-bold text-xs">{dateRange.label}</span>
                  </div>
                  <p className="text-text-secondary text-xs mt-2">Please pick a date within this range.</p>
                  <button
                    onClick={() => setSelectedDate('')}
                    className="mt-3 text-xs font-bold text-brand-accent hover:underline block mx-auto"
                  >
                    ← Show all articles
                  </button>
                </>
              ) : (
                <p className="text-text-secondary text-xs mt-1">Please check back in a few minutes or change filters.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {globalArticles.map((article) => {
                const isPositive = article.sentiment === 'Positive';
                const isNegative = article.sentiment === 'Negative';
                const isBookmarked = bookmarkedArticleIds.includes(article._id);
                
                return (
                  <div
                    key={article._id}
                    className="group bg-white border border-brand-border hover:border-gray-300 rounded-xl p-3 flex flex-col justify-between transition-all duration-200 hover:translate-y-[-2px] shadow-sm hover:shadow relative overflow-hidden"
                  >
                    {isPositive && <div className="absolute top-0 left-0 right-0 h-0.5 bg-brand-emerald" />}
                    {isNegative && <div className="absolute top-0 left-0 right-0 h-0.5 bg-brand-rose" />}
                    
                    {article.urlToImage && (
                      <div className="-mx-3 -mt-3 mb-2.5 h-32 overflow-hidden rounded-t-xl">
                        <img 
                          src={article.urlToImage} 
                          alt={article.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}

                    <div>
                      {/* Meta information */}
                      <div className="flex items-center justify-between text-[9px] text-text-secondary mb-1.5">
                        <span className="font-bold text-brand-accent uppercase tracking-wide">
                          {article.category} {article.country && `• ${article.country.toUpperCase()}`}
                        </span>
                        <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                      </div>

                      {/* Title */}
                      <a 
                        href={`/news/article/${article._id}`}
                        className="text-[13px] font-serif font-bold text-brand-primary group-hover:text-brand-accentHover transition-colors line-clamp-3 leading-tight block"
                      >
                        {article.title}
                      </a>
                      
                      {/* Description */}
                      <p className="text-text-secondary text-[11px] mt-1.5 line-clamp-2 leading-relaxed">
                        {article.description}
                      </p>

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        {article.sentiment && (
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-sm border ${
                            isPositive
                              ? 'bg-emerald-50 border-brand-emerald text-brand-emerald'
                              : isNegative
                              ? 'bg-red-50 border-brand-rose text-brand-rose'
                              : 'bg-gray-50 border-gray-300 text-text-secondary'
                          }`}>
                            {article.sentiment}
                          </span>
                        )}

                        {article.factCheckScore !== undefined && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-sm bg-blue-50 border border-brand-primary text-brand-primary flex items-center gap-1">
                            <FiCheckCircle className="text-[8px]" /> {article.factCheckScore}/100
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom control tools */}
                    <div className="flex items-center justify-end gap-1 border-t border-gray-100 pt-2.5 mt-3">
                      
                      <button
                        onClick={async () => {
                          if (!isAuthenticated) return showToast('Please login to bookmark', 'error');
                          try {
                            const token = localStorage.getItem('token');
                            const response = await axios.post(`/api/users/bookmark/${article._id}`, {}, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            if (response.data.success) {
                              setBookmarkedArticleIds(prev => 
                                response.data.isBookmarked 
                                  ? [...prev, article._id]
                                  : prev.filter(id => id !== article._id)
                              );
                              showToast(response.data.isBookmarked ? 'Article bookmarked' : 'Bookmark removed', 'success');
                            }
                          } catch (err) {
                            showToast('Failed to bookmark', 'error');
                          }
                        }}
                        className={`p-1 rounded transition-all border ${
                          isBookmarked 
                            ? 'bg-brand-accent text-white border-brand-accent' 
                            : 'text-text-secondary hover:text-brand-primary hover:bg-gray-50 border-gray-200'
                        }`}
                        title={isBookmarked ? "Remove Bookmark" : "Save for later"}
                      >
                        <FiBookmark className={`text-xs ${isBookmarked ? 'fill-current' : ''}`} />
                      </button>

                      <button
                        onClick={() => shareNative(article.title, article.url)}
                        className="p-1 text-text-secondary hover:text-brand-primary hover:bg-gray-50 border border-gray-200 rounded transition-all"
                      >
                        <FiShare2 className="text-xs" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= NEARBY BUZZ (LOCAL) FEED ================= */}
      {feedType === 'local' && (
        <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Create Post Widget */}
            <form onSubmit={handleCreatePost} className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-brand-primary mb-2 flex items-center gap-1.5">
                <FiPlus className="text-brand-accent" /> Broadcast a Nearby Alert
              </h2>
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What's happening in your local neighborhood right now?"
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary placeholder-gray-400"
              />
              
              <div className="flex flex-wrap gap-3 items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <select
                    value={newPostCategory}
                    onChange={(e) => setNewPostCategory(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-text-primary focus:outline-none"
                  >
                    {LOCAL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-text-secondary font-medium hover:text-text-primary">
                    <input
                      type="checkbox"
                      checked={newPostAnon}
                      onChange={(e) => setNewPostAnon(e.target.checked)}
                      className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary w-4 h-4"
                    />
                    Post Anonymously
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={creatingPost || !newPostContent.trim()}
                  className="bg-brand-primary hover:bg-brand-primaryHover text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm hover:scale-[1.02] disabled:opacity-50"
                >
                  {creatingPost ? 'Publishing...' : 'Broadcast'}
                </button>
              </div>
            </form>

            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {['all', ...LOCAL_CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setLocalCategory(cat)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                    localCategory === cat
                      ? 'bg-brand-primary border-brand-primary text-white'
                      : 'bg-white border-gray-200 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {cat === 'all' ? 'All Nearby Alerts' : cat}
                </button>
              ))}
            </div>

            {localLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-10 h-10 border-4 border-t-brand-primary border-r-transparent border-gray-200 rounded-full animate-spin" />
              </div>
            ) : !coordinates ? (
              <div className="text-center py-12 border border-dashed border-gray-300 rounded-xl bg-white">
                <FiNavigation className="text-3xl text-gray-400 mx-auto mb-2 animate-pulse" />
                <h3 className="text-sm font-bold text-text-primary">GPS Required</h3>
                <p className="text-text-secondary text-xs mt-1">Enable location to see nearby alerts.</p>
              </div>
            ) : localPosts.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-300 rounded-xl bg-white">
                <FiMap className="text-3xl text-gray-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-text-primary">Nothing nearby yet</h3>
                <p className="text-text-secondary text-xs mt-1">Be the first to post a local alert!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {localPosts.map((post) => {
                  const hasLiked = post.likes.includes(user?._id);
                  return (
                    <div
                      key={post._id}
                      className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all hover:border-gray-300"
                    >
                      {/* Post image if present */}
                      {post.imageUrl && (
                        <div className="h-40 overflow-hidden">
                          <img src={post.imageUrl} alt="Local alert" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                        </div>
                      )}
                      <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center font-bold text-xs text-brand-accent">
                            {post.isAnonymous ? 'A' : (post.author?.username?.charAt(0).toUpperCase() || 'U')}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-text-primary flex items-center gap-1">
                              {post.isAnonymous ? 'Anonymous' : post.author?.username || 'Local Resident'}
                              {post.author?.isJournalistVerified && (
                                <span className="text-[8px] bg-emerald-50 text-brand-emerald border border-brand-emerald px-1 py-0.5 rounded-full font-bold uppercase">
                                  Journalist
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-text-secondary mt-0.5">
                              {new Date(post.createdAt).toLocaleDateString()} • {post.category}
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 text-text-primary px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1">
                          <FiNavigation className="text-brand-accent rotate-45 text-[9px]" /> {post.distanceLabel}
                        </div>
                      </div>

                      <p className="text-text-primary text-xs leading-relaxed mb-4 whitespace-pre-line select-text font-serif">
                        {post.content}
                      </p>

                      <div className="flex items-center gap-4 border-t border-gray-100 pt-3 text-text-secondary">
                        <button
                          onClick={() => handleLikePost(post._id)}
                          className={`flex items-center gap-1 text-[11px] font-semibold transition-all ${
                            hasLiked ? 'text-brand-accent' : 'hover:text-brand-primary'
                          }`}
                        >
                          <FiThumbsUp className="text-xs" /> {post.likes?.length || 0}
                        </button>
                        
                        <a
                          href={`/news/article/${post._id}/comments`}
                          className="flex items-center gap-1 text-[11px] font-semibold hover:text-brand-primary"
                        >
                          <FiMessageSquare className="text-xs" /> {post.comments?.length || 0}
                        </a>

                        <button
                          onClick={() => handleFlagPost(post._id)}
                          className="flex items-center gap-1 text-[11px] font-semibold hover:text-brand-rose ml-auto transition-all"
                        >
                          <FiFlag className="text-xs" /> Report
                        </button>
                      </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          <div className="flex flex-col gap-6">
            
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
                <FiNavigation className="text-brand-accent animate-pulse" /> Geolocation Status
              </h2>

              <div className="flex flex-col gap-4 text-xs font-medium">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="text-text-secondary">GPS Radar Sensor</span>
                  {coordinates ? (
                    <span className="text-brand-emerald font-bold flex items-center gap-1">
                      <FiCheckCircle /> ONLINE
                    </span>
                  ) : geoLoading ? (
                    <span className="text-text-muted animate-pulse">FINDING COORDS...</span>
                  ) : (
                    <span className="text-brand-rose font-bold flex items-center gap-1">
                      <FiAlertCircle /> NO ACCESS
                    </span>
                  )}
                </div>

                {coordinates && (
                  <>
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                      <span className="text-text-secondary">Latitude</span>
                      <span className="text-text-primary font-bold">{coordinates.latitude.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                      <span className="text-text-secondary">Longitude</span>
                      <span className="text-text-primary font-bold">{coordinates.longitude.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary">Search Radius Limit</span>
                      <span className="text-brand-primary font-bold">{user?.radius || 10} km</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-1.5">
                <FiShare2 className="text-brand-accent" /> Share Local Bulletins
              </h3>
              <p className="text-text-secondary text-xs leading-relaxed mb-4">
                Instantly syndicate community posts directly to Twitter or share natively with fellow local residents.
              </p>
              <button
                onClick={() => shareNative("Checking out real-time geospatial bulletins on PulsePoint!", window.location.origin)}
                className="w-full bg-white hover:bg-gray-50 text-text-primary py-2.5 rounded-xl text-xs font-bold border border-gray-200 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-sm"
              >
                <FiTwitter className="text-brand-primary text-base" /> Tweet Platform Invite
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ================= FOLLOWING FEED ================= */}
      {feedType === 'following' && (
        <div className="animate-fade-in max-w-3xl mx-auto">

          {/* ── Network & Connections Section (People You Follow & Discover Users) ── */}
          <div className="mb-6 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-brand-primary mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FiUsers className="text-brand-accent text-base" /> Network & Connections
              </span>
              <span className="text-[11px] font-semibold text-text-secondary">
                Following {networkUsers.followingUsers.length} people
              </span>
            </h2>

            {/* People You Follow */}
            <div className="mb-5">
              <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">
                People You Follow ({networkUsers.followingUsers.length})
              </h3>
              {networkUsers.followingUsers.length === 0 ? (
                <p className="text-xs text-text-muted italic bg-gray-50 p-3 rounded-xl border border-gray-100">
                  You are not following anyone yet. Discover people below!
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {networkUsers.followingUsers.map(u => (
                    <div key={u._id} className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-brand-primary text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                          {u.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <a href={`/user/${u._id}`} className="text-xs font-bold text-text-primary hover:text-brand-primary truncate block">
                            {u.username}
                          </a>
                          <span className="text-[10px] text-text-secondary capitalize">{u.role}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleFollowUser(u._id)}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-text-secondary hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex-shrink-0"
                      >
                        Unfollow
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Discover People to Follow */}
            <div>
              <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">
                Discover People to Follow
              </h3>
              {networkUsers.suggestedUsers.length === 0 ? (
                <p className="text-xs text-text-muted italic">No new users to suggest right now.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {networkUsers.suggestedUsers.map(u => (
                    <div key={u._id} className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-white hover:border-brand-primary/30 transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-brand-accent font-bold flex items-center justify-center text-xs flex-shrink-0">
                          {u.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <a href={`/user/${u._id}`} className="text-xs font-bold text-text-primary hover:text-brand-accent truncate block">
                            {u.username}
                          </a>
                          <span className="text-[10px] text-text-secondary capitalize">{u.role}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleFollowUser(u._id)}
                        className="text-[10px] font-bold px-3 py-1 rounded-lg bg-brand-primary text-white hover:bg-brand-primaryHover transition-all flex-shrink-0"
                      >
                        + Follow
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── What is this tab? Explanation banner ── */}
          <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-3 items-start">
            <FiUsers className="text-brand-primary mt-0.5 flex-shrink-0 text-sm" />
            <div>
              <p className="text-xs font-bold text-text-primary">Timeline Updates</p>
              <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                Posts from <strong>people you follow</strong> AND posts from <strong>communities you've joined</strong> appear below.
              </p>
            </div>
          </div>

          {followingLoading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-4 border-t-brand-primary border-r-transparent border-gray-200 rounded-full animate-spin" />
            </div>
          ) : followingPosts.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-gray-300 rounded-xl bg-white">
              <FiUsers className="text-3xl text-gray-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-text-primary">Your feed is empty</h3>
              <p className="text-text-secondary text-xs mt-1 mb-1 max-w-xs mx-auto">You'll see posts here once you:</p>
              <ul className="text-text-secondary text-xs space-y-0.5 mb-4">
                <li>• Follow users — visit their profile → click Follow</li>
                <li>• Join a community — go to Communities tab → Join</li>
              </ul>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setFeedType('local')}
                  className="bg-brand-primary text-white font-semibold px-3 py-1.5 rounded-lg text-xs"
                >
                  Nearby Buzz
                </button>
                <a
                  href="/communities"
                  className="bg-white border border-gray-200 text-text-primary font-semibold px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50"
                >
                  Browse Communities
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">

              {/* ── People You Follow ── */}
              {followingPosts.filter(p => !p.community).length > 0 && (
                <>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="flex items-center gap-1 whitespace-nowrap"><FiUsers className="text-xs" /> From people you follow</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  {followingPosts.filter(p => !p.community).map((post) => {
                    const hasLiked = post.likes?.includes(user?._id);
                    return (
                      <div key={post._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-all">
                        {post.imageUrl && (
                          <div className="h-36 overflow-hidden">
                            <img src={post.imageUrl} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-xs text-brand-primary">
                              {post.author?.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <a href={`/user/${post.author?._id}`} className="text-xs font-semibold text-text-primary hover:text-brand-primary">{post.isAnonymous ? 'Anonymous' : post.author?.username}</a>
                              <div className="text-[10px] text-text-secondary">{new Date(post.createdAt).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <p className="text-text-primary text-xs leading-relaxed mb-3 font-serif">{post.content}</p>
                          <div className="flex items-center gap-4 border-t border-gray-100 pt-2 text-text-secondary">
                            <button onClick={() => handleLikePost(post._id)} className={`flex items-center gap-1 text-[11px] font-semibold ${hasLiked ? 'text-brand-accent' : 'hover:text-brand-primary'}`}>
                              <FiThumbsUp className="text-xs" /> {post.likes?.length || 0}
                            </button>
                            <a href={`/news/article/${post._id}/comments`} className="flex items-center gap-1 text-[11px] font-semibold hover:text-brand-primary">
                              <FiMessageSquare className="text-xs" /> {post.comments?.length || 0}
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* ── From Communities You Joined ── */}
              {followingPosts.filter(p => p.community).length > 0 && (
                <>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="flex items-center gap-1 whitespace-nowrap"><FiGlobe className="text-xs" /> From your communities</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  {followingPosts.filter(p => p.community).map((post) => {
                    const hasLiked = post.likes?.includes(user?._id);
                    return (
                      <div key={post._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-all">
                        {post.imageUrl && (
                          <div className="h-36 overflow-hidden">
                            <img src={post.imageUrl} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center font-bold text-xs text-brand-accent">
                              {post.author?.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-text-primary">{post.isAnonymous ? 'Anonymous' : post.author?.username}</div>
                              <div className="text-[10px] text-text-secondary flex items-center gap-1">
                                <a href={`/community/${post.community._id}`} className="font-bold text-brand-accent hover:underline">
                                  c/{post.community.name}
                                </a>
                                <span>•</span>
                                {new Date(post.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <p className="text-text-primary text-xs leading-relaxed mb-3 font-serif">{post.content}</p>
                          <div className="flex items-center gap-4 border-t border-gray-100 pt-2 text-text-secondary">
                            <button onClick={() => handleLikePost(post._id)} className={`flex items-center gap-1 text-[11px] font-semibold ${hasLiked ? 'text-brand-accent' : 'hover:text-brand-primary'}`}>
                              <FiThumbsUp className="text-xs" /> {post.likes?.length || 0}
                            </button>
                            <a href={`/news/article/${post._id}/comments`} className="flex items-center gap-1 text-[11px] font-semibold hover:text-brand-primary">
                              <FiMessageSquare className="text-xs" /> {post.comments?.length || 0}
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

            </div>
          )}
        </div>
      )}

    </div>
  );
}