import React, { useState, useEffect } from 'react';
import { useNews } from '../context/NewsContext';
import { FiSearch, FiX, FiFilter } from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const SearchBar = () => {
  const { filters, updateFilters } = useNews();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [localFilters, setLocalFilters] = useState({
    country: filters.country || 'us',
    category: filters.category || 'general',
    from: filters.from ? new Date(filters.from) : null,
    to: filters.to ? new Date(filters.to) : null,
  });

  const countries = [
    { code: 'us', name: 'United States' },
    { code: 'gb', name: 'United Kingdom' },
    { code: 'ca', name: 'Canada' },
    { code: 'au', name: 'Australia' },
    { code: 'in', name: 'India' },
  ];

  const categories = [
    'general', 'business', 'entertainment', 'health',
    'science', 'sports', 'technology'
  ];

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      updateFilters({ q: searchQuery });
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchQuery, updateFilters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setLocalFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date, field) => {
    setLocalFilters(prev => ({
      ...prev,
      [field]: date
    }));
  };

  const applyFilters = () => {
    updateFilters({
      country: localFilters.country,
      category: localFilters.category,
      from: localFilters.from ? localFilters.from.toISOString().split('T')[0] : '',
      to: localFilters.to ? localFilters.to.toISOString().split('T')[0] : ''
    });
    setShowFilters(false);
  };

  const resetFilters = () => {
    setLocalFilters({
      country: 'us',
      category: 'general',
      from: null,
      to: null,
    });
    updateFilters({
      country: 'us',
      category: 'general',
      from: '',
      to: '',
      q: ''
    });
    setSearchQuery('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-2">
      <div className="relative flex items-center">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search for news..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="ml-2 p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          <FiFilter className="w-5 h-5" />
        </button>
      </div>

      {showFilters && (
        <div className="mt-4 p-4 bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select
                name="country"
                value={localFilters.country}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {countries.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={localFilters.category}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <DatePicker
                selected={localFilters.from}
                onChange={(date) => handleDateChange(date, 'from')}
                selectsStart
                startDate={localFilters.from}
                endDate={localFilters.to}
                maxDate={new Date()}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholderText="Select start date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <DatePicker
                selected={localFilters.to}
                onChange={(date) => handleDateChange(date, 'to')}
                selectsEnd
                startDate={localFilters.from}
                endDate={localFilters.to}
                minDate={localFilters.from}
                maxDate={new Date()}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholderText="Select end date"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Reset
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
