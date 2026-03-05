import React, { useState, useEffect } from 'react';
import { useContext } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { format } from 'date-fns';

const CommunityBuzz = () => {
  const { user } = useAuth();
  const socket = useWebSocket();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [poll, setPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);

  // Load initial data
  useEffect(() => {
    // TODO: Fetch initial comments and poll from API
    fetchComments();
    fetchDailyPoll();
  }, []);

  // Handle WebSocket updates
  useEffect(() => {
    if (!socket) return;

    socket.on('newComment', (comment) => {
      setComments(prev => [comment, ...prev]);
    });

    socket.on('commentUpdated', (updatedComment) => {
      setComments(prev => 
        prev.map(comment => 
          comment._id === updatedComment._id ? updatedComment : comment
        )
      );
    });

    socket.on('commentDeleted', (commentId) => {
      setComments(prev => prev.filter(comment => comment._id !== commentId));
    });

    socket.on('pollUpdate', (updatedPoll) => {
      setPoll(updatedPoll);
    });

    return () => {
      socket.off('newComment');
      socket.off('commentUpdated');
      socket.off('commentDeleted');
      socket.off('pollUpdate');
    };
  }, [socket]);

  const fetchComments = async () => {
    try {
      const response = await fetch('/api/comments');
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchDailyPoll = async () => {
    try {
      const response = await fetch('/api/polls/daily');
      const data = await response.json();
      setPoll(data);
    } catch (error) {
      console.error('Error fetching daily poll:', error);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: newComment,
          parentId: replyingTo,
        }),
      });

      if (response.ok) {
        setNewComment('');
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
  };

  const handleUpdateComment = async (commentId, content) => {
    try {
      await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content }),
      });
      setEditingComment(null);
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleReact = async (commentId, reaction) => {
    try {
      await fetch(`/api/comments/${commentId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reaction }),
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleVote = async (optionId) => {
    if (!poll || !user) return;
    
    try {
      const response = await fetch(`/api/polls/${poll._id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ optionId }),
      });
      
      if (response.ok) {
        const updatedPoll = await response.json();
        setPoll(updatedPoll);
        setSelectedOption(optionId);
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const renderReplies = (replies, level = 0) => {
    return replies.map(reply => (
      <div key={reply._id} className={`ml-${(level + 1) * 4} mt-2 border-l-2 pl-4`}>
        <div className="flex items-start mb-2">
          <img 
            src={reply.user.avatar || '/default-avatar.png'} 
            alt={reply.user.name}
            className="w-8 h-8 rounded-full mr-2"
          />
          <div className="flex-1">
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">{reply.user.name}</span>
                <span className="text-xs text-gray-500">
                  {format(new Date(reply.createdAt), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
              
              {editingComment === reply._id ? (
                <div className="mt-2">
                  <input
                    type="text"
                    defaultValue={reply.content}
                    onBlur={(e) => handleUpdateComment(reply._id, e.target.value)}
                    className="w-full p-2 border rounded"
                    autoFocus
                  />
                </div>
              ) : (
                <p className="mt-1">{reply.content}</p>
              )}
              
              <div className="flex items-center mt-2 text-sm text-gray-500">
                <button 
                  onClick={() => handleReact(reply._id, 'like')}
                  className="flex items-center mr-4 hover:text-blue-500"
                >
                  👍 {reply.reactions?.like || 0}
                </button>
                <button 
                  onClick={() => handleReact(reply._id, 'dislike')}
                  className="flex items-center mr-4 hover:text-red-500"
                >
                  👎 {reply.reactions?.dislike || 0}
                </button>
                <button 
                  onClick={() => setReplyingTo(reply._id)}
                  className="hover:text-blue-500 mr-4"
                >
                  Reply
                </button>
                
                {user?._id === reply.user._id && (
                  <>
                    <button 
                      onClick={() => setEditingComment(reply._id)}
                      className="hover:text-blue-500 mr-2"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteComment(reply._id)}
                      className="hover:text-red-500"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {replyingTo === reply._id && (
              <form onSubmit={handleSubmitComment} className="mt-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full p-2 border rounded"
                  autoFocus
                />
                <div className="mt-2">
                  <button 
                    type="submit" 
                    className="bg-blue-500 text-white px-4 py-1 rounded mr-2"
                  >
                    Reply
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setReplyingTo(null)}
                    className="bg-gray-200 px-4 py-1 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            
            {reply.replies?.length > 0 && renderReplies(reply.replies, level + 1)}
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Community Buzz</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* New Comment Form */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Share your thoughts</h2>
            <form onSubmit={handleSubmitComment}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full p-3 border rounded-lg mb-3 h-24"
                disabled={!user}
              />
              <div className="flex justify-end">
                <button 
                  type="submit" 
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  disabled={!newComment.trim() || !user}
                >
                  Post
                </button>
              </div>
            </form>
          </div>
          
          {/* Comments Section */}
          <div className="space-y-6">
            {comments.map(comment => (
              <div key={comment._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start mb-4">
                  <img 
                    src={comment.user.avatar || '/default-avatar.png'} 
                    alt={comment.user.name}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{comment.user.name}</span>
                      <span className="text-sm text-gray-500">
                        {format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    
                    {editingComment === comment._id ? (
                      <div className="mt-2">
                        <input
                          type="text"
                          defaultValue={comment.content}
                          onBlur={(e) => handleUpdateComment(comment._id, e.target.value)}
                          className="w-full p-2 border rounded"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <p className="mt-1">{comment.content}</p>
                    )}
                    
                    <div className="flex items-center mt-3 text-sm text-gray-500">
                      <button 
                        onClick={() => handleReact(comment._id, 'like')}
                        className="flex items-center mr-4 hover:text-blue-500"
                      >
                        👍 {comment.reactions?.like || 0}
                      </button>
                      <button 
                        onClick={() => handleReact(comment._id, 'dislike')}
                        className="flex items-center mr-4 hover:text-red-500"
                      >
                        👎 {comment.reactions?.dislike || 0}
                      </button>
                      <button 
                        onClick={() => setReplyingTo(comment._id)}
                        className="hover:text-blue-500"
                      >
                        Reply
                      </button>
                      
                      {user?._id === comment.user._id && (
                        <>
                          <button 
                            onClick={() => setEditingComment(comment._id)}
                            className="hover:text-blue-500 ml-4"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteComment(comment._id)}
                            className="hover:text-red-500 ml-2"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                    
                    {replyingTo === comment._id && (
                      <form onSubmit={handleSubmitComment} className="mt-3">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a reply..."
                          className="w-full p-2 border rounded"
                          autoFocus
                        />
                        <div className="mt-2">
                          <button 
                            type="submit" 
                            className="bg-blue-500 text-white px-4 py-1 rounded mr-2"
                          >
                            Reply
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setReplyingTo(null)}
                            className="bg-gray-200 px-4 py-1 rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                    
                    {comment.replies?.length > 0 && (
                      <div className="mt-4">
                        {renderReplies(comment.replies)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Daily Poll */}
          {poll && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Daily Poll</h2>
              <h3 className="font-medium mb-3">{poll.question}</h3>
              
              <div className="space-y-3">
                {poll.options.map(option => {
                  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
                  const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                  const isSelected = selectedOption === option._id || 
                                   (user && option.voters?.includes(user._id));
                  
                  return (
                    <div key={option._id} className="mb-2">
                      <div className="flex justify-between mb-1">
                        <span>{option.text}</span>
                        <span className="text-sm text-gray-500">{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-500 h-2.5 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">
                          {option.votes} vote{option.votes !== 1 ? 's' : ''}
                        </span>
                        {!isSelected && !selectedOption && (
                          <button
                            onClick={() => handleVote(option._id)}
                            className="text-xs text-blue-500 hover:underline"
                            disabled={!user}
                          >
                            Vote
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 text-sm text-gray-500">
                {poll.totalVotes} total votes • {format(new Date(poll.expiresAt), 'MMM d, yyyy')}
              </div>
            </div>
          )}
          
          {/* Community Guidelines */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-3">Community Guidelines</h2>
            <ul className="text-sm space-y-2 text-gray-600">
              <li>• Be respectful and kind to others</li>
              <li>• Keep discussions relevant to the news</li>
              <li>• No hate speech or harassment</li>
              <li>• Respect different opinions</li>
              <li>• Report any inappropriate content</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityBuzz;
