import React, { useState } from 'react';
import { 
  Box, 
  Avatar, 
  Typography, 
  TextField, 
  Button, 
  IconButton,
  Divider,
  Collapse
} from '@mui/material';
import { 
  Reply as ReplyIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ThumbUpOutlined as ThumbUpOutlinedIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

const Comment = ({ 
  comment, 
  onReply, 
  onLike, 
  currentUser,
  level = 0 
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showReplies, setShowReplies] = useState(true);
  const hasReplies = comment.replies && comment.replies.length > 0;

  const handleReply = () => {
    if (!replyContent.trim()) return;
    onReply(comment._id, replyContent);
    setReplyContent('');
    setIsReplying(false);
  };

  return (
    <Box 
      sx={{ 
        ml: level * 3,
        mb: 2,
        borderLeft: level > 0 ? '2px solid #e0e0e0' : 'none',
        pl: level > 0 ? 2 : 0,
        position: 'relative'
      }}
    >
      <Box display="flex" alignItems="flex-start" mb={1}>
        <Avatar 
          src={comment.user?.avatar} 
          alt={comment.user?.name} 
          sx={{ width: 32, height: 32, mr: 1.5 }}
        />
        <Box flex={1}>
          <Box display="flex" alignItems="center" mb={0.5}>
            <Typography variant="subtitle2" fontWeight="bold" mr={1}>
              {comment.user?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDistanceToNow(new Date(comment.createdAt))} ago
            </Typography>
          </Box>
          <Typography variant="body2" paragraph>
            {comment.content}
          </Typography>
          
          <Box display="flex" alignItems="center" mt={0.5}>
            <IconButton 
              size="small" 
              onClick={() => onLike(comment._id)}
              color={comment.likes?.includes(currentUser?._id) ? 'primary' : 'default'}
            >
              <ThumbUpOutlinedIcon fontSize="small" />
            </IconButton>
            <Typography variant="caption" color="text.secondary" mr={1}>
              {comment.likes?.length || 0}
            </Typography>
            
            <Button 
              size="small" 
              startIcon={<ReplyIcon fontSize="small" />}
              onClick={() => {
                setIsReplying(!isReplying);
                setReplyContent('');
              }}
            >
              Reply
            </Button>
            
            {hasReplies && (
              <Button 
                size="small" 
                startIcon={showReplies ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setShowReplies(!showReplies)}
                sx={{ ml: 1 }}
              >
                {showReplies ? 'Hide replies' : `Show replies (${comment.replies.length})`}
              </Button>
            )}
          </Box>
          
          {isReplying && (
            <Box mt={1} ml={-1}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                multiline
                rows={2}
              />
              <Box display="flex" justifyContent="flex-end" mt={1} gap={1}>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => setIsReplying(false)}
                >
                  Cancel
                </Button>
                <Button 
                  size="small" 
                  variant="contained" 
                  onClick={handleReply}
                  disabled={!replyContent.trim()}
                >
                  Reply
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
      
      {hasReplies && (
        <Collapse in={showReplies} timeout="auto" unmountOnExit>
          <Box>
            {comment.replies.map((reply) => (
              <Comment
                key={reply._id}
                comment={reply}
                onReply={onReply}
                onLike={onLike}
                currentUser={currentUser}
                level={level + 1}
              />
            ))}
          </Box>
        </Collapse>
      )}
      
      {level === 0 && <Divider sx={{ my: 1.5 }} />}
    </Box>
  );
};

export default Comment;
