import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container } from '@mui/material';
import News from './News';

const NewsHome = () => {
  const { category = 'top' } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  // Define tab labels and their corresponding routes
  const tabLabels = [
    { key: 'top', label: 'Top Stories' },
    { key: 'most-viewed', label: 'Most Viewed' },
    { key: 'trending', label: 'Trending' },
    { key: 'breaking', label: 'Breaking' },
    { key: 'all', label: 'All News' }
  ];

  // Update active tab when category changes
  useEffect(() => {
    const tabIndex = tabLabels.findIndex(tab => tab.key === category);
    if (tabIndex !== -1) {
      setActiveTab(tabIndex);
    }
  }, [category]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    navigate(`/news/${tabLabels[newValue].key}`);
  };

  return (
    <News 
      activeTab={activeTab}
      onTabChange={handleTabChange}
      tabLabels={tabLabels}
      initialCategory={category}
    />
  );
};

export default NewsHome;
