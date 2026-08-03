import React, { useState, useEffect } from 'react';
import { useNews } from '../context/NewsContext';
import NewsCard from './NewsCard';
import { FiClock, FiTrendingUp, FiAward, FiZap } from 'react-icons/fi';

const NewsSection = ({ type = 'top' }) => {
  const { news, loading, error, fetchNews } = useNews();
  const [timeRange, setTimeRange] = useState('today');
  const [activeCategory, setActiveCategory] = useState('general');

  const categories = [
    'general', 'business', 'entertainment', 'health',
    'science', 'sports', 'technology'
  ];

  useEffect(() => {
    let params = {};
    
    switch (type) {
      case 'top':
        params = { category: activeCategory };
        fetchNews('/top-headlines', params);
        break;
      case 'trending':
        // For demo purposes, we'll use the everything endpoint with a popular query
        fetchNews('/everything', { q: 'trending OR popular OR viral', sortBy: 'popularity' });
        break;
      case 'breaking':
        fetchNews('/top-headlines', { pageSize: 5 });
        break;
      default:
        fetchNews('/top-headlines');
    }
  }, [type, activeCategory, timeRange, fetchNews]);

  const renderHeader = () => {
    switch (type) {
      case 'top':
        return (
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Top Headlines</h2>
            <div className="flex space-x-2 mt-2 md:mt-0 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-4 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                    activeCategory === category
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>
        );
      case 'trending':
        return (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <FiTrendingUp className="mr-2 text-orange-500" />
              Trending Now
            </h2>
            <div className="flex space-x-2">
              {['today', 'week', 'month'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    timeRange === range
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        );
      case 'most-viewed':
        return (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <FiAward className="mr-2 text-purple-500" />
              Most Viewed
            </h2>
            <div className="flex items-center text-sm text-gray-500">
              <FiClock className="mr-1" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-transparent border-0 focus:ring-0 focus:outline-none"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        );
      case 'breaking':
        return (
          <div className="flex items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <FiZap className="mr-2 text-red-500 animate-pulse" />
              Breaking News
            </h2>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="py-8">
        {renderHeader()}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-t-lg"></div>
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!news || news.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500">No news articles found.</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      {renderHeader()}
      
      {type === 'breaking' ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {news.slice(0, 2).map((article, index) => (
              <NewsCard 
                key={`${article.publishedAt}-${index}`} 
                article={article} 
                isBreaking={true}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((article, index) => (
            <NewsCard 
              key={`${article.publishedAt}-${index}`} 
              article={{ ...article, category: type === 'top' ? activeCategory : article.category }} 
              showCategory={type === 'top'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NewsSection;
