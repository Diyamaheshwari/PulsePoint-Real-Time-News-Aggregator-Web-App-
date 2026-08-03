import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, useSocket } from '../hooks';
import axios from 'axios';
import { 
  FiArrowLeft, FiMessageSquare, FiThumbsUp, FiCornerDownRight, 
  FiSend, FiTrash2, FiAlertCircle
} from 'react-icons/fi';

export default function CommentsPage() {
  const { id: targetId } = useParams(); // targetId can be a post ID or news ID
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Resolve targetType by checking the URL format or setting a state
  const isNews = window.location.pathname.includes('/news/article/');
  const targetType = isNews ? 'news' : 'post';

  // Target object (Post or News Article)
  const [targetItem, setTargetItem] = useState(null);
  const [targetLoading, setTargetLoading] = useState(true);

  // Comments states
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyToId, setReplyToId] = useState(null); // ID of comment being replied to
  const [replyText, setReplyText] = useState('');
  
  // Toast notifications
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ show: true, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Real-time socket update
  const handleNewCommentSocket = (data) => {
    // data has targetType, targetId, comment
    if (data.targetId === targetId) {
      const newComment = data.comment;
      
      setComments((prev) => {
        // If it is a nested reply
        if (newComment.parentComment) {
          return prev.map((c) => {
            if (c._id === newComment.parentComment) {
              // Add to replies array of top-level comment
              if (c.replies.some((r) => r._id === newComment._id)) return c;
              return {
                ...c,
                replies: [...c.replies, newComment],
              };
            }
            return c;
          });
        }
        
        // If it's a top-level comment
        if (prev.some((c) => c._id === newComment._id)) return prev;
        return [newComment, ...prev];
      });
      showToast('New comment broadcasted live!', 'info');
    }
  };

  useSocket({
    newComment: handleNewCommentSocket,
  });

  // Fetch Target Context (Post or News)
  const fetchTargetItem = async () => {
    setTargetLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = isNews ? `/api/news/${targetId}` : `/api/local/post/${targetId}`;
      const response = await axios.get(url, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      
      if (response.data.success) {
        setTargetItem(isNews ? response.data.article : response.data.post);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load item context details', 'error');
    } finally {
      setTargetLoading(false);
    }
  };

  // Fetch Comments List
  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/comments/${targetType}/${targetId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      if (response.data.success) {
        setComments(response.data.comments || []);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading comments', 'error');
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    fetchTargetItem();
    fetchComments();
  }, [targetId]);

  // Submit Top-Level Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/comments/${targetType}/${targetId}`,
        { content: newCommentText },
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );

      if (response.data.success) {
        setNewCommentText('');
        showToast('Comment published!', 'success');
        
        // Optimistically push if socket delay
        const newC = response.data.comment;
        setComments((prev) => {
          if (prev.some((c) => c._id === newC._id)) return prev;
          return [newC, ...prev];
        });
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to submit comment. Please log in.', 'error');
    }
  };

  // Submit Threaded Reply
  const handleAddReply = async (parentCommentId) => {
    if (!replyText.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/comments/${targetType}/${targetId}`,
        { content: replyText, parentCommentId },
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );

      if (response.data.success) {
        setReplyText('');
        setReplyToId(null);
        showToast('Reply published successfully!', 'success');

        const newReply = response.data.comment;
        setComments((prev) =>
          prev.map((c) => {
            if (c._id === parentCommentId) {
              if (c.replies.some((r) => r._id === newReply._id)) return c;
              return {
                ...c,
                replies: [...c.replies, newReply],
              };
            }
            return c;
          })
        );
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to publish reply', 'error');
    }
  };

  // Toggle Comment Like
  const handleLikeComment = async (commentId, isReply = false, parentId = null) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/comments/like/${commentId}`, {}, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      
      if (response.data.success) {
        setComments((prev) =>
          prev.map((c) => {
            if (isReply && c._id === parentId) {
              return {
                ...c,
                replies: c.replies.map((r) => {
                  if (r._id === commentId) {
                    const hasLiked = r.likes.includes(user?._id);
                    return {
                      ...r,
                      likes: hasLiked
                        ? r.likes.filter((id) => id !== user?._id)
                        : [...r.likes, user?._id],
                    };
                  }
                  return r;
                }),
              };
            } else if (!isReply && c._id === commentId) {
              const hasLiked = c.likes.includes(user?._id);
              return {
                ...c,
                likes: hasLiked
                  ? c.likes.filter((id) => id !== user?._id)
                  : [...c.likes, user?._id],
              };
            }
            return c;
          })
        );
      }
    } catch (err) {
      console.error(err);
      showToast('Log in to like comments', 'error');
    }
  };

  // Delete Comment Action
  const handleDeleteComment = async (commentId, isReply = false, parentId = null) => {
    if (!window.confirm('Delete this comment permanently?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/api/comments/${commentId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });

      if (response.data.success) {
        showToast('Comment deleted', 'success');
        setComments((prev) => {
          if (isReply && parentId) {
            return prev.map((c) => {
              if (c._id === parentId) {
                return {
                  ...c,
                  replies: c.replies.filter((r) => r._id !== commentId),
                };
              }
              return c;
            });
          }
          return prev.filter((c) => c._id !== commentId);
        });
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting comment', 'error');
    }
  };

  const isCommentOwner = (comment) => {
    if (!comment || !comment.author) return false;
    const authorId = typeof comment.author === 'object' ? comment.author._id : comment.author;
    return authorId === user?._id;
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 md:px-8 bg-brand-surface min-h-screen animate-fade-in relative select-none">
      
      {/* Toast Alert */}
      {toast.show && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded flex items-center gap-3 border transition-all duration-300 animate-slide-in ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-brand-rose' : 'bg-gray-900 border-gray-800 text-white'
        }`}>
          <FiAlertCircle className="text-lg flex-shrink-0" />
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm font-medium mb-6 transition-colors"
      >
        <FiArrowLeft /> Back
      </button>

      {/* Context Top Card */}
      {targetLoading ? (
        <div className="flex justify-center items-center py-10 bg-white border-b border-gray-100 mb-8">
          <div className="w-6 h-6 border-2 border-t-brand-primary border-r-transparent border-gray-200 rounded-full animate-spin" />
        </div>
      ) : targetItem ? (
        <div className="bg-white border-b border-gray-100 pb-6 mb-8">
          <div className="flex items-center text-xs text-text-secondary mb-2 uppercase tracking-wide gap-2">
            <span className="font-bold text-text-primary">
              {isNews ? 'Article' : targetItem.category}
            </span>
            <span>•</span>
            <span>{new Date(targetItem.createdAt || targetItem.publishedAt).toLocaleDateString()}</span>
          </div>
          
          <h1 className="text-xl md:text-2xl font-bold font-serif text-text-primary leading-tight">
            {isNews ? targetItem.title : targetItem.content}
          </h1>
        </div>
      ) : null}

      {/* Write New Top-Level Comment */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-8">
        <form onSubmit={handleAddComment} className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 bg-transparent border-none text-sm text-text-primary focus:outline-none placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={!newCommentText.trim()}
            className="bg-brand-primary hover:bg-brand-primaryHover text-white px-6 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            Post Comment
          </button>
        </form>
      </div>

      {/* Discussion List */}
      <h3 className="text-sm font-bold text-text-primary mb-5 uppercase tracking-wide border-b border-gray-100 pb-3">
        Comments ({comments.length + comments.reduce((acc, c) => acc + (c.replies?.length || 0), 0)})
      </h3>

      {loadingComments ? (
        <div className="flex justify-center items-center py-16">
          <div className="w-6 h-6 border-2 border-t-brand-primary border-r-transparent border-gray-200 rounded-full animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="py-12 text-gray-500 text-sm">
          No comments yet. Be the first to share your thoughts.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {comments.map((comment) => {
            const hasLiked = comment.likes?.includes(user?._id);
            const isOwner = isCommentOwner(comment);
            const isMod = ['admin', 'moderator'].includes(user?.role);
            
            return (
              <div 
                key={comment._id} 
                className="flex flex-col gap-2 relative"
              >
                {/* Visual Thread line connecting to replies */}
                {comment.replies && comment.replies.length > 0 && (
                   <div className="absolute left-[15px] top-[40px] bottom-0 w-px bg-gray-200 z-0" />
                )}

                {/* Comment author info */}
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-medium text-xs text-text-primary">
                      {comment.author?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        {comment.author?.username || 'Resident'}
                        {comment.author?.isJournalistVerified && (
                          <span className="text-[8px] border border-gray-300 text-gray-500 px-1 py-0.5 rounded uppercase">
                            Reporter
                          </span>
                        )}
                        {comment.author?._id === user?._id && (
                          <span className="text-[8px] bg-gray-100 text-text-secondary px-1 py-0.5 rounded uppercase">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {(isOwner || isMod) && (
                    <button
                      onClick={() => handleDeleteComment(comment._id)}
                      className="text-text-muted hover:text-brand-rose p-1 transition-colors"
                    >
                      <FiTrash2 className="text-xs" />
                    </button>
                  )}
                </div>

                {/* Content text */}
                <p className="text-text-primary font-serif text-sm leading-relaxed whitespace-pre-line select-text pl-10 relative z-10">
                  {comment.content}
                </p>

                {/* Footer Controls (Like & Reply Buttons) */}
                <div className="flex items-center gap-4 text-xs text-text-secondary pl-10 pt-1 relative z-10">
                  <button
                    onClick={() => handleLikeComment(comment._id)}
                    className={`flex items-center gap-1.5 transition-colors ${
                      hasLiked ? 'text-brand-primary font-medium' : 'hover:text-text-primary'
                    }`}
                  >
                    <FiThumbsUp className="text-xs" /> {comment.likes?.length || 0}
                  </button>

                  <button
                    onClick={() => setReplyToId(replyToId === comment._id ? null : comment._id)}
                    className={`hover:text-text-primary transition-colors ${
                      replyToId === comment._id ? 'text-text-primary font-medium' : ''
                    }`}
                  >
                    Reply
                  </button>
                </div>

                {/* Nested Comment Input */}
                {replyToId === comment._id && (
                  <div className="mt-2 ml-10 p-3 rounded bg-gray-50 flex gap-2 relative z-10">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to ${comment.author?.username || 'Resident'}...`}
                      className="flex-1 bg-transparent border-none text-xs text-text-primary focus:outline-none"
                    />
                    <button
                      onClick={() => handleAddReply(comment._id)}
                      disabled={!replyText.trim()}
                      className="text-brand-primary text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      Reply
                    </button>
                  </div>
                )}

                {/* Nested Threaded Replies Rendering */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="flex flex-col gap-3 mt-3 pl-10 relative z-10">
                    {comment.replies.map((reply) => {
                      const replyLiked = reply.likes?.includes(user?._id);
                      const isReplyOwner = isCommentOwner(reply);
                      
                      return (
                        <div key={reply._id} className="flex flex-col gap-1.5 pt-2 border-t border-gray-100 relative">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="text-xs font-medium text-text-primary flex items-center gap-1.5">
                                {reply.author?.username || 'Resident'}
                                {reply.author?._id === user?._id && (
                                  <span className="text-[8px] bg-gray-100 text-text-secondary px-1 py-0.5 rounded uppercase">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-text-muted">
                                {new Date(reply.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            {(isReplyOwner || isMod) && (
                              <button
                                onClick={() => handleDeleteComment(reply._id, true, comment._id)}
                                className="text-text-muted hover:text-brand-rose p-1 transition-colors"
                              >
                                <FiTrash2 className="text-[10px]" />
                              </button>
                            )}
                          </div>

                          <p className="text-text-primary font-serif text-sm leading-relaxed select-text">
                            {reply.content}
                          </p>

                          <div className="flex items-center gap-3 text-xs text-text-secondary pt-1">
                            <button
                              onClick={() => handleLikeComment(reply._id, true, comment._id)}
                              className={`flex items-center gap-1 transition-colors ${
                                replyLiked ? 'text-brand-primary font-medium' : 'hover:text-text-primary'
                              }`}
                            >
                              <FiThumbsUp className="text-[10px]" /> {reply.likes?.length || 0}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
