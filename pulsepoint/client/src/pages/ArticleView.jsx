import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiCpu, FiExternalLink, FiCalendar, FiClock, FiShare2, FiBookmark } from 'react-icons/fi';
import { useAuth } from '../hooks';

export default function ArticleView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summarising, setSummarising] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/news/${id}`);
        if (response.data.success) {
          setArticle(response.data.article);
          if (response.data.article.summary) {
            setSummary(response.data.article.summary);
          }
        } else {
          setError('Article not found');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load the article.');
      } finally {
        setLoading(false);
      }
    };
    
    const checkBookmark = async () => {
      if (!user) return;
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/users/bookmarks', {
          headers: { Authorization: token ? `Bearer ${token}` : '' }
        });
        if (response.data.success) {
          const bookmarks = response.data.bookmarks;
          setIsBookmarked(bookmarks.some(b => b._id === id || b === id));
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchArticle();
    checkBookmark();
  }, [id, user]);

  const handleBookmark = async () => {
    if (!user) return alert('Please login to bookmark articles');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/users/bookmark/${id}`, {}, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      if (response.data.success) {
        setIsBookmarked(response.data.isBookmarked);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to bookmark');
    }
  };

  const handleSummarise = async () => {
    if (summary) return;
    setSummarising(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/news/${id}/summarise`, {}, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      if (response.data.success) {
        setSummary(response.data.summary);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate summary');
    } finally {
      setSummarising(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-surface flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-t-brand-primary border-r-transparent border-gray-200 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-brand-surface flex flex-col justify-center items-center p-4">
        <h2 className="text-2xl font-bold font-serif text-brand-primary mb-4">{error || 'Article not found'}</h2>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-brand-primary text-white font-bold rounded-xl shadow-sm"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-surface py-8 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-text-secondary hover:text-brand-primary font-bold text-sm mb-6 transition-colors"
        >
          <FiArrowLeft /> Back to Feed
        </button>

        <article className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
          
          {/* Header Image */}
          {article.urlToImage && (
            <div className="w-full h-[40vh] md:h-[50vh] relative">
              <img 
                src={article.urlToImage} 
                alt={article.title}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                <div className="flex gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-brand-accent text-white">
                    {article.category}
                  </span>
                  {article.country && (
                    <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/30">
                      {article.country}
                    </span>
                  )}
                </div>
                <h1 className="text-xl md:text-2xl font-serif font-bold text-white leading-tight drop-shadow-md">
                  {article.title}
                </h1>
              </div>
            </div>
          )}

          <div className="p-4 md:p-6">
            
            {/* Title for articles without images */}
            {!article.urlToImage && (
              <>
                <div className="flex gap-2 mb-4">
                  <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-brand-accent">
                    {article.category}
                  </span>
                  {article.country && (
                    <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-text-secondary">
                      {article.country}
                    </span>
                  )}
                </div>
                <h1 className="text-xl md:text-2xl font-serif font-bold text-brand-primary leading-tight mb-4">
                  {article.title}
                </h1>
              </>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs font-semibold text-text-secondary mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <span className="font-bold flex items-center gap-1.5">
                  <FiClock /> {new Date(article.publishedAt).toLocaleDateString()}
                </span>
                {article.source?.name && (
                  <span className="font-bold">Source: <span className="text-text-primary">{article.source.name}</span></span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleBookmark}
                  className={`p-2 rounded-lg transition-colors border ${
                    isBookmarked 
                      ? 'bg-brand-accent text-white border-brand-accent' 
                      : 'bg-gray-50 text-text-secondary hover:bg-gray-100 border-gray-200 hover:text-brand-primary'
                  }`}
                  title={isBookmarked ? "Remove Bookmark" : "Save for later"}
                >
                  <FiBookmark className={isBookmarked ? 'fill-current' : ''} />
                </button>
                <button 
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(window.location.href)}`)}
                  className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:text-brand-primary"
                  title="Share"
                >
                  <FiShare2 />
                </button>
              </div>
            </div>

            {/* AI Summary Section */}
            <div className="mb-10 bg-orange-50 border border-brand-accent/20 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[150%] bg-white/40 blur-[40px] pointer-events-none" />
              <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="font-bold text-brand-accent flex items-center gap-2">
                  <FiCpu className="text-lg" /> AI Executive Summary
                </h3>
                {!summary && (
                  <button 
                    onClick={handleSummarise}
                    disabled={summarising}
                    className="px-4 py-2 bg-white text-brand-accent border border-brand-accent/30 rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all disabled:opacity-50"
                  >
                    {summarising ? 'Generating...' : 'Generate Summary'}
                  </button>
                )}
              </div>
              
              {summary ? (
                <div className="text-text-primary leading-relaxed text-sm relative z-10">
                  {summary}
                </div>
              ) : (
                <div className="text-text-secondary text-sm italic relative z-10">
                  Click 'Generate Summary' to get a quick AI-powered overview of this article.
                </div>
              )}
            </div>

            {/* Article Content */}
            <div className="prose prose-lg max-w-none text-text-primary font-serif leading-relaxed">
              <p className="text-xl leading-relaxed mb-6 font-medium">
                {article.description}
              </p>
              
              <p className="whitespace-pre-line">
                {article.content ? article.content.replace(/\[\+\d+ chars\]/, '') : "Full content is not available for this article."}
              </p>
            </div>

            {/* Action Bottom */}
            <div className="mt-12 pt-8 border-t border-gray-100 text-center">
              <p className="text-text-secondary text-sm mb-4">Want to read the full original story?</p>
              <a 
                href={article.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-brand-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-primaryHover transition-all shadow-sm hover:scale-[1.02]"
              >
                Read Original Article <FiExternalLink />
              </a>
            </div>

          </div>
        </article>
      </div>
    </div>
  );
}
