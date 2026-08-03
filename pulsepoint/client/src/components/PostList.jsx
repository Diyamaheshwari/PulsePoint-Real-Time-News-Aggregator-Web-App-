import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPosts, selectAllPosts } from '../features/community/communitySlice';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Avatar, 
  CardHeader,
  CardActions,
  IconButton,
  Divider,
  CircularProgress
} from '@mui/material';
import { 
  FavoriteBorder as LikeIcon, 
  ChatBubbleOutline as CommentIcon,
  Share as ShareIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

const PostList = () => {
  const dispatch = useDispatch();
  const posts = useSelector(selectAllPosts);
  const { status } = useSelector(state => state.community);
  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchPosts());
    }
  }, [status, dispatch]);

  if (status === 'loading' && posts.length === 0) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (posts.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="textSecondary">
          No posts yet. Be the first to share your thoughts!
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {posts.map((post) => (
        <Card key={post._id} sx={{ mb: 3, borderRadius: 2 }}>
          <CardHeader
            avatar={
              <Avatar 
                src={post.author?.avatar} 
                alt={post.author?.username}
              />
            }
            action={
              <IconButton aria-label="settings">
                <MoreVertIcon />
              </IconButton>
            }
            title={post.author?.username || 'Anonymous'}
            subheader={formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          />
          <CardContent>
            <Typography variant="body1" paragraph>
              {post.content}
            </Typography>
          </CardContent>
          <Divider />
          <CardActions disableSpacing>
            <Box display="flex" width="100%" justifyContent="space-around">
              <IconButton aria-label="like">
                <LikeIcon />
                <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>
                  {post.likes?.length || 0}
                </Typography>
              </IconButton>
              <IconButton aria-label="comment">
                <CommentIcon />
                <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>
                  {post.comments?.length || 0}
                </Typography>
              </IconButton>
              <IconButton aria-label="share">
                <ShareIcon />
              </IconButton>
            </Box>
          </CardActions>
        </Card>
      ))}
    </Box>
  );
};

export default PostList;
