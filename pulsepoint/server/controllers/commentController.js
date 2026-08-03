/**
 * NewsSphere – Comment Controller
 *
 * Supports threaded comments on both local Posts and
 * aggregated News articles, with real-time Socket.io broadcasts.
 */
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

// ── Get comments for a post or news article ────────────────────
exports.getComments = async (req, res) => {
  try {
    const { targetType, targetId } = req.params; // 'post' or 'news'
    const { page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { parentComment: null }; // top-level comments only
    if (targetType === 'post') {
      filter.post = targetId;
    } else {
      filter.newsArticleId = targetId;
    }

    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('author', 'username avatar role isJournalistVerified')
        .populate({
          path: 'replies',
          options: { sort: { createdAt: 1 } },
          populate: [
            { path: 'author', select: 'username avatar role' },
            {
              path: 'replies',
              populate: { path: 'author', select: 'username avatar' }
            }
          ]
        })
        .lean(),
      Comment.countDocuments(filter)
    ]);

    res.json({ success: true, comments, pagination: { page: parseInt(page), total } });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ success: false, message: 'Error fetching comments' });
  }
};

// ── Add a comment ──────────────────────────────────────────────
exports.addComment = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    const { content, parentCommentId } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    const commentData = {
      content: content.trim(),
      author: req.user._id
    };

    if (targetType === 'post') {
      commentData.post = targetId;
    } else {
      commentData.newsArticleId = targetId;
    }

    // Handle threaded reply
    if (parentCommentId) {
      commentData.parentComment = parentCommentId;
    }

    const comment = await Comment.create(commentData);

    // Link to parent and notify
    if (parentCommentId) {
      const parent = await Comment.findByIdAndUpdate(parentCommentId, {
        $push: { replies: comment._id }
      });
      
      // Notify parent comment author if it's someone else
      if (parent && parent.author.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: parent.author,
          sender: req.user._id,
          type: 'reply',
          comment: comment._id,
          post: targetType === 'post' ? targetId : undefined
        });
      }
    }

    // If it's a post comment, also link to the post's comments array
    if (targetType === 'post') {
      await Post.findByIdAndUpdate(targetId, {
        $push: { comments: comment._id }
      });
    }

    const populated = await Comment.findById(comment._id)
      .populate('author', 'username avatar role isJournalistVerified');

    // Real-time broadcast
    const io = req.app.get('webSocketService')?.io;
    if (io) {
      const room = targetType === 'post' ? `post:${targetId}` : `news:${targetId}`;
      io.to(room).emit('newComment', { targetType, targetId, comment: populated });
    }

    res.status(201).json({ success: true, comment: populated });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ success: false, message: 'Error adding comment' });
  }
};

// ── Like / unlike a comment ────────────────────────────────────
exports.toggleCommentLike = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    const userId = req.user._id;
    const isLiked = comment.likes.includes(userId);

    if (isLiked) {
      comment.likes.pull(userId);
    } else {
      comment.likes.push(userId);
    }
    await comment.save();

    res.json({ success: true, liked: !isLiked, likeCount: comment.likes.length });
  } catch (error) {
    console.error('Toggle comment like error:', error);
    res.status(500).json({ success: false, message: 'Error toggling like' });
  }
};

// ── Delete a comment ───────────────────────────────────────────
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    // Only author, moderator, or admin can delete
    const isOwner = comment.author.toString() === req.user._id.toString();
    const isMod = ['admin', 'moderator'].includes(req.user.role);
    if (!isOwner && !isMod) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Remove from parent's replies array
    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(comment.parentComment, {
        $pull: { replies: comment._id }
      });
    }

    // Remove from post's comments array
    if (comment.post) {
      await Post.findByIdAndUpdate(comment.post, {
        $pull: { comments: comment._id }
      });
    }

    // Recursively delete replies
    await deleteReplies(comment._id);
    await comment.deleteOne();

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ success: false, message: 'Error deleting comment' });
  }
};

// ── Recursive reply deletion helper ────────────────────────────
async function deleteReplies(commentId) {
  const replies = await Comment.find({ parentComment: commentId });
  for (const reply of replies) {
    await deleteReplies(reply._id);
    await reply.deleteOne();
  }
}
