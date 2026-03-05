// server/services/websocketService.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Poll = require('../models/Poll');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const NewsInteraction = require('../models/NewsInteraction');
const { setWebSocketService } = require('../utils/websocket');

class WebSocketService {
  constructor(server) {
    const isProduction = process.env.NODE_ENV === 'production';
    const allowedOrigins = isProduction 
      ? [process.env.CLIENT_URL]
      : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000'];

    console.log('Initializing WebSocket server with origins:', allowedOrigins);
    
    this.io = new Server(server, {
      cors: {
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
            callback(null, true);
          } else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
          }
        },
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.initializeNamespaces();
    setWebSocketService(this);
  }

  initializeNamespaces() {
    // Main namespace for news interactions
    const newsNamespace = this.io.of('/news');
    
    newsNamespace.on('connection', (socket) => {
      console.log('New client connected to news namespace');

      // Handle post room leaving
      socket.on('leavePostRoom', ({ postId }) => {
        if (!postId) return;
        
        console.log(`Socket ${socket.id} leaving post room: ${postId}`);
        socket.leave(`post_${postId}`);
      });

      // Handle article subscription
      socket.on('subscribeToArticle', async (articleId) => {
        if (!articleId) return;
        
        // Leave previous room if exists
        if (socket.articleRoom) {
          socket.leave(socket.articleRoom);
          console.log(`Left room: ${socket.articleRoom}`);
        }

        // Join new room
        socket.articleRoom = `article:${articleId}`;
        socket.join(socket.articleRoom);
        console.log(`Client subscribed to article ${articleId}`);
      });

      // Handle unsubscription
      socket.on('unsubscribeFromArticle', (articleId) => {
        if (socket.articleRoom === `article:${articleId}`) {
          socket.leave(socket.articleRoom);
          console.log(`Client unsubscribed from article ${articleId}`);
          delete socket.articleRoom;
        }
      });

      // Handle new comments
      socket.on('newComment', async ({ articleId, content, userId }) => {
        if (!articleId || !content || !userId) return;
        
        try {
          const comment = {
            id: Date.now().toString(),
            userId: socket.user.id,
            username: socket.user.username || 'Anonymous',
            content: content.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          // Broadcast to all clients in the article room
          const roomName = `article:${articleId}`;
          this.io.to(roomName).emit('newComment', {
            articleId,
            comment
          });
          
          console.log(`New comment on article ${articleId} by user ${userId}`);
          
        } catch (error) {
          console.error('Error handling new comment:', error);
        }
      });

      // Handle comment updates
      socket.on('updateComment', async ({ articleId, commentId, content }) => {
        if (!articleId || !commentId || !content) return;
        
        try {
          // In a real app, you would update the comment in the database here
          // For now, we'll just broadcast the update to all clients
          
          const roomName = `article:${articleId}`;
          this.io.to(roomName).emit('commentUpdated', {
            articleId,
            comment: {
              id: commentId,
              content: content.trim(),
              updatedAt: new Date().toISOString()
            }
          });
          
          console.log(`Comment ${commentId} updated on article ${articleId} by user ${socket.user.id}`);
          
        } catch (error) {
          console.error('Error updating comment:', error);
        }
      });

      // Handle comment deletions
      socket.on('deleteComment', async ({ articleId, commentId }) => {
        if (!articleId || !commentId) return;
        
        try {
          // In a real app, you would delete the comment from the database here
          // For now, we'll just broadcast the deletion to all clients
          
          const roomName = `article:${articleId}`;
          this.io.to(roomName).emit('commentDeleted', {
            articleId,
            commentId
          });
          
          console.log(`Comment ${commentId} deleted from article ${articleId} by user ${socket.user.id}`);
          
        } catch (error) {
          console.error('Error deleting comment:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Client disconnected from news namespace');
        if (socket.articleRoom) {
          socket.leave(socket.articleRoom);
          delete socket.articleRoom;
        }
      });
    });
  }

  // Emit event to a specific article room
  emitToArticle(articleId, event, data) {
    if (!articleId) return;
    this.io.of('/news').to(`article:${articleId}`).emit(event, data);
  }

  // Emit new comment to article room
  emitNewComment(articleId, comment) {
    this.emitToArticle(articleId, 'newComment', {
      articleId,
      comment: {
        id: comment._id || comment.id,
        content: comment.content,
        userId: comment.user || comment.userId,
        username: comment.username,
        timestamp: comment.createdAt || comment.timestamp || new Date()
      }
    });
  }

  // Emit comment update to article room
  emitCommentUpdated(articleId, comment) {
    this.emitToArticle(articleId, 'commentUpdated', {
      articleId,
      comment: {
        id: comment._id || comment.id,
        content: comment.content,
        updatedAt: comment.updatedAt || new Date()
      }
    });
  }

  // Emit comment deletion to article room
  emitCommentDeleted(articleId, commentId) {
    this.emitToArticle(articleId, 'commentDeleted', {
      articleId,
      commentId
    });
  }
}

module.exports = WebSocketService;