import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardMedia, 
  CardContent,
  CircularProgress,
  Button,
  Divider,
  IconButton,
  Chip
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Share as ShareIcon, BookmarkBorder as BookmarkIcon } from '@mui/icons-material';
import api from '../utils/api';

const ArticleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        // In a real app, you would fetch the article from your API
        // const response = await api.get(`/api/articles/${id}`);
        // setArticle(response.data);
        
        // For now, we'll use mock data
        const mockArticle = {
          id,
          title: 'Sample Article Title',
          description: 'This is a sample article description that would be replaced with real content from your API.',
          content: 'This is the full content of the article. In a real application, this would be fetched from your backend API based on the article ID in the URL.',
          urlToImage: 'https://source.unsplash.com/random/1200x600?news',
          publishedAt: new Date().toISOString(),
          source: { name: 'News Source' },
          author: 'Author Name',
          category: 'general',
          readTime: '5 min read'
        };
        
        setArticle(mockArticle);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching article:', err);
        setError('Failed to load article. Please try again later.');
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography color="error" variant="h6" align="center">
          {error}
        </Typography>
        <Box mt={2} display="flex" justifyContent="center">
          <Button variant="contained" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Box>
      </Container>
    );
  }

  if (!article) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h6" align="center">
          Article not found
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={3}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Back to News
        </Button>
      </Box>

      <Card elevation={0} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden' }}>
        {article.urlToImage && (
          <CardMedia
            component="img"
            height="400"
            image={article.urlToImage}
            alt={article.title}
            sx={{ objectFit: 'cover' }}
          />
        )}
        
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box display="flex" alignItems="center" mb={2}>
            <Chip 
              label={article.category} 
              size="small" 
              color="primary"
              variant="outlined"
              sx={{ mr: 1, textTransform: 'capitalize' }}
            />
            <Typography variant="caption" color="text.secondary">
              {new Date(article.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })} • {article.readTime}
            </Typography>
          </Box>
          
          <Typography variant="h3" component="h1" gutterBottom sx={{ 
            fontSize: { xs: '2rem', md: '2.5rem' },
            fontWeight: 700,
            lineHeight: 1.2,
            mb: 3
          }}>
            {article.title}
          </Typography>
          
          <Box display="flex" alignItems="center" mb={4}>
            <Typography variant="subtitle1" color="text.secondary">
              By {article.author || article.source.name}
            </Typography>
            <Box flexGrow={1} />
            <IconButton aria-label="Bookmark">
              <BookmarkIcon />
            </IconButton>
            <IconButton aria-label="Share">
              <ShareIcon />
            </IconButton>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="body1" paragraph sx={{ 
            fontSize: '1.1rem',
            lineHeight: 1.8,
            mb: 3,
            whiteSpace: 'pre-line'
          }}>
            {article.content}
          </Typography>
          
          {/* Add comments section here */}
          <Box mt={6}>
            <Typography variant="h6" gutterBottom>
              Comments (0)
            </Typography>
            <Typography color="text.secondary">
              Comments will be displayed here
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ArticleDetail;