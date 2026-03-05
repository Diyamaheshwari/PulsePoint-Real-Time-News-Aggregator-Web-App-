import React, { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardActions, 
  Avatar, 
  Typography, 
  IconButton, 
  TextField, 
  Button,
  Box,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  ThumbUp as ThumbUpIcon, 
  ChatBubbleOutline as CommentIcon, 
  Share as ShareIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../hooks';
import { useCommunity } from '../../context/CommunityContext';
import CommentList from './CommentList';

const Post = ({ post }) => {
  const { user } = useAuth();
  const { toggleLike, addComment } = useCommunity();
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  const isLiked = post.likes?.includes(user?._id) || false;
  const likeCount = post.likes?.length || 0;
  const commentCount = post.comments?.length || 0;

  const handleLike = async () => {
    await toggleLike('post', post._id);
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    await addComment(post._id, commentText);
    setCommentText('');
    setReplyingTo(null);
    if (!showComments) setShowComments(true);
  };

  const handleMenuOpen = (e) => {
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    // Implement edit functionality
    handleMenuClose();
  };

  const handleDelete = () => {
    // Implement delete functionality
    handleMenuClose();
  };

  const handleReply = (commentId) => {
    setReplyingTo(commentId);
    setShowComments(true);
  };

  return (
    <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 3 }}>
      <CardHeader
        avatar={
          <Avatar 
            src={post.author?.avatar} 
            alt={post.author?.username?.charAt(0)?.toUpperCase() || 'U'}
          />
        }
        action={
          user?._id === post.author?._id && (
            <>
              <IconButton onClick={handleMenuOpen}>
                <MoreVertIcon />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={handleEdit}>
                  <ListItemIcon>
                    <EditIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Edit</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleDelete}>
                  <ListItemIcon>
                    <DeleteIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
                </MenuItem>
              </Menu>
            </>
          )
        }
        title={post.author?.username || 'Anonymous'}
        subheader={post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : 'Just now'}
        titleTypographyProps={{ fontWeight: 'bold' }}
      />
      
      <CardContent>
        <Typography variant="body1" paragraph>
          {post.content}
        </Typography>
        {post.imageUrl && (
          <Box 
            component="img"
            src={post.imageUrl}
            alt="Post content"
            sx={{ 
              width: '100%', 
              maxHeight: 400, 
              objectFit: 'contain',
              borderRadius: 1,
              mt: 1
            }}
          />
        )}
      </CardContent>

      <CardActions sx={{ px: 2, pt: 0, justifyContent: 'space-between' }}>
        <Box>
          <IconButton onClick={handleLike} color={isLiked ? 'primary' : 'default'}>
            <ThumbUpIcon />
          </IconButton>
          <Typography variant="body2" component="span" color="text.secondary">
            {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
          </Typography>
        </Box>
        
        <Box>
          <IconButton onClick={() => setShowComments(!showComments)}>
            <CommentIcon />
          </IconButton>
          <Typography variant="body2" component="span" color="text.secondary">
            {commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}
          </Typography>
        </Box>

        <IconButton>
          <ShareIcon />
        </IconButton>
      </CardActions>

      {showComments && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Box component="form" onSubmit={handleCommentSubmit} sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Avatar 
              src={user?.avatar} 
              alt={user?.username?.charAt(0)?.toUpperCase() || 'U'}
              sx={{ width: 32, height: 32, mt: 0.5 }}
            />
            <TextField
              fullWidth
              size="small"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              InputProps={{
                sx: { borderRadius: 20, bgcolor: 'action.hover' }
              }}
            />
            <Button 
              type="submit" 
              variant="contained" 
              size="small" 
              disabled={!commentText.trim()}
              sx={{ borderRadius: 20 }}
            >
              Post
            </Button>
          </Box>

          <CommentList 
            comments={post.comments || []} 
            onReply={handleReply}
            replyingTo={replyingTo}
          />
        </Box>
      )}
    </Card>
  );
};

export default Post;
