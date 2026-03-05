import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Avatar, 
  TextField, 
  Button, 
  IconButton,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  ThumbUp as ThumbUpIcon, 
  Reply as ReplyIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../hooks';
import { useCommunity } from '../../context/CommunityContext';

const CommentItem = ({ 
  comment, 
  onReply, 
  replyingTo,
  isReply = false 
}) => {
  const { user } = useAuth();
  const { toggleLike } = useCommunity();
  const [anchorEl, setAnchorEl] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);

  const isLiked = comment.likes?.includes(user?._id) || false;
  const likeCount = comment.likes?.length || 0;
  const replyCount = comment.replies?.length || 0;

  const handleMenuOpen = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    setIsEditing(true);
    handleMenuClose();
  };

  const handleSaveEdit = async () => {
    // Implement save edit functionality
    setIsEditing(false);
  };

  const handleDelete = () => {
    // Implement delete functionality
    handleMenuClose();
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    await toggleLike('comment', comment._id);
  };

  const handleReplyClick = (e) => {
    e.stopPropagation();
    onReply(comment._id);
  };

  return (
    <Box 
      sx={{ 
        mb: 2,
        ml: isReply ? 4 : 0,
        pl: isReply ? 2 : 0,
        borderLeft: isReply ? '2px solid' : 'none',
        borderColor: 'divider',
        position: 'relative'
      }}
    >
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <Avatar 
          src={comment.author?.avatar} 
          alt={comment.author?.username?.charAt(0)?.toUpperCase() || 'U'}
          sx={{ width: 32, height: 32, mt: 0.5 }}
        />
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mr: 1 }}>
              {comment.author?.username || 'Anonymous'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {comment.createdAt ? 
                formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : 
                'Just now'}
            </Typography>
            {user?._id === comment.author?._id && (
              <>
                <IconButton 
                  size="small" 
                  onClick={handleMenuOpen}
                  sx={{ ml: 'auto' }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  onClick={(e) => e.stopPropagation()}
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
            )}
          </Box>
          
          {isEditing ? (
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                autoFocus
              />
              <Button 
                size="small" 
                variant="contained" 
                onClick={handleSaveEdit}
                disabled={!editedContent.trim()}
              >
                Save
              </Button>
              <Button 
                size="small" 
                onClick={() => {
                  setIsEditing(false);
                  setEditedContent(comment.content);
                }}
              >
                Cancel
              </Button>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {comment.content}
            </Typography>
          )}
          
          <Box sx={{ display: 'flex', gap: 1, mt: 1, ml: -1 }}>
            <IconButton 
              size="small" 
              color={isLiked ? 'primary' : 'default'}
              onClick={handleLike}
            >
              <ThumbUpIcon fontSize="small" />
            </IconButton>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, mr: 1 }}>
              {likeCount}
            </Typography>
            
            <IconButton 
              size="small" 
              onClick={handleReplyClick}
              color={replyingTo === comment._id ? 'primary' : 'default'}
            >
              <ReplyIcon fontSize="small" />
            </IconButton>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              {replyCount > 0 ? `${replyCount} ${replyCount === 1 ? 'Reply' : 'Replies'}` : 'Reply'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Render replies if any */}
      {comment.replies?.length > 0 && (
        <Box sx={{ mt: 1 }}>
          {comment.replies.map((reply) => (
            <CommentItem 
              key={reply._id} 
              comment={reply} 
              onReply={onReply}
              replyingTo={replyingTo}
              isReply={true}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

const CommentList = ({ comments = [], onReply, replyingTo }) => {
  return (
    <Box sx={{ mt: 2 }}>
      {comments.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
          No comments yet. Be the first to comment!
        </Typography>
      ) : (
        comments.map((comment) => (
          <React.Fragment key={comment._id}>
            <CommentItem 
              comment={comment} 
              onReply={onReply}
              replyingTo={replyingTo}
            />
            <Divider sx={{ my: 1 }} />
          </React.Fragment>
        ))
      )}
    </Box>
  );
};

export default CommentList;
