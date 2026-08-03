import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { OpenInNew as OpenInNewIcon, ChatBubbleOutline as CommentIcon } from '@mui/icons-material';
import NewsReactions from './NewsReactions';
import { useAuth } from '../../context/AuthContext';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 8px 25px rgba(0,0,0,0.12)',
  },
  '& .MuiCardContent-root': {
    padding: '16px',
    '&:last-child': {
      paddingBottom: '16px',
    }
  },
}));

const NewsContent = styled(CardContent)(({ theme }) => ({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: '20px',
  '& h3': {
    fontSize: '1.1rem',
    fontWeight: 600,
    marginBottom: '12px',
    lineHeight: 1.4,
    color: theme.palette.text.primary,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  '& p': {
    color: theme.palette.text.secondary,
    fontSize: '0.9rem',
    lineHeight: 1.6,
    marginBottom: '16px',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}));

const StyledCardMedia = styled('img')({
  width: '100%',
  height: '200px',
  objectFit: 'cover',
  borderTopLeftRadius: '12px',
  borderTopRightRadius: '12px',
});

const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const EnhancedNewsCard = ({ article }) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const commentCount = article.commentCount || 0;

  const getImageUrl = () => {
    if (imageError) {
      return 'https://via.placeholder.com/400x200?text=Image+Not+Available';
    }
    return article.urlToImage || 'https://via.placeholder.com/400x200?text=No+Image';
  };

  const handleCommentClick = (e) => {
    e.preventDefault();
    navigate(`/news/${article.id || article.url}`);
  };

  return (
    <StyledCard>
      <Box sx={{ position: 'relative', height: 200, overflow: 'hidden' }}>
        <StyledCardMedia
          src={getImageUrl()}
          alt={article.title}
          onError={() => setImageError(true)}
        />
      </Box>
      <NewsContent>
        <Typography variant="h3" component="h3">
          {article.title}
        </Typography>
        <Typography variant="body2" color="textSecondary" component="p">
          {article.description}
        </Typography>
        
        {/* Reactions */}
        <Box sx={{ mt: 'auto' }}>
          <NewsReactions articleId={article.id || article.url} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <IconButton 
              size="small" 
              onClick={handleCommentClick}
              aria-label="View comments"
              sx={{ color: 'text.secondary' }}
            >
              <CommentIcon fontSize="small" />
              {commentCount > 0 && (
                <Typography variant="caption" sx={{ ml: 0.5 }}>
                  {commentCount}
                </Typography>
              )}
            </IconButton>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="textSecondary">
                {article.source?.name}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {formatDate(article.publishedAt)}
              </Typography>
              <Button
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                color="primary"
                endIcon={<OpenInNewIcon />}
              >
                Read
              </Button>
            </Box>
          </Box>
        </Box>
      </NewsContent>
    </StyledCard>
  );
};

export default EnhancedNewsCard;
