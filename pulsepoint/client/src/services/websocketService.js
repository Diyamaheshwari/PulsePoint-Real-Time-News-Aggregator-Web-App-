// client/src/services/websocketService.js
import io from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.subscriptions = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(token) {
    if (this.socket) return;

    // Use WebSocket protocol (ws://) for the connection
    const socketUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';
    const options = {
      path: '/socket.io',
      transports: ['websocket'],
      query: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts
    };

    console.log('Connecting to WebSocket at:', socketUrl);
    this.socket = io(socketUrl, options);
    
    // Add error handler
    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      
      // Resubscribe to previously subscribed articles
      this.subscriptions.forEach((_, articleId) => {
        this.subscribeToArticle(articleId);
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.connected = false;
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.connected = false;
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      this.reconnectAttempts = attempt;
      console.log(`WebSocket reconnection attempt ${attempt + 1}/${this.maxReconnectAttempts}`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed after maximum attempts');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.subscriptions.clear();
    }
  }

  subscribeToArticle(articleId) {
    if (!this.socket || !articleId) return;
    
    if (!this.subscriptions.has(articleId)) {
      this.subscriptions.set(articleId, []);
    }
    
    if (this.connected) {
      this.socket.emit('subscribeToArticle', articleId);
    }
  }

  unsubscribeFromArticle(articleId) {
    if (!this.socket || !articleId) return;
    
    const listeners = this.subscriptions.get(articleId) || [];
    listeners.forEach(({ eventName, listener }) => {
      this.socket.off(eventName, listener);
    });
    
    this.subscriptions.delete(articleId);
    
    if (this.connected) {
      this.socket.emit('unsubscribeFromArticle', articleId);
    }
  }

  onReactionUpdate(articleId, callback) {
    if (!this.socket || !articleId) return () => {};

    const eventName = 'reactionUpdate';
    const listener = (data) => {
      if (data.articleId === articleId) {
        callback(data);
      }
    };

    this.socket.on(eventName, listener);
    this.subscriptions.get(articleId)?.push({ eventName, listener });

    return () => {
      this.socket.off(eventName, listener);
    };
  }

  onNewComment(articleId, callback) {
    if (!this.socket || !articleId) return () => {};

    const eventName = 'newComment';
    const listener = (data) => {
      if (data.articleId === articleId) {
        callback(data);
      }
    };

    this.socket.on(eventName, listener);
    this.subscriptions.get(articleId)?.push({ eventName, listener });

    return () => {
      this.socket.off(eventName, listener);
    };
  }

  onCommentUpdated(articleId, callback) {
    if (!this.socket || !articleId) return () => {};

    const eventName = 'commentUpdated';
    const listener = (data) => {
      if (data.articleId === articleId) {
        callback(data);
      }
    };

    this.socket.on(eventName, listener);
    this.subscriptions.get(articleId)?.push({ eventName, listener });

    return () => {
      this.socket.off(eventName, listener);
    };
  }

  onCommentDeleted(articleId, callback) {
    if (!this.socket || !articleId) return () => {};

    const eventName = 'commentDeleted';
    const listener = (data) => {
      if (data.articleId === articleId) {
        callback(data);
      }
    };

    this.socket.on(eventName, listener);
    this.subscriptions.get(articleId)?.push({ eventName, listener });

    return () => {
      this.socket.off(eventName, listener);
    };
  }

  sendReaction(articleId, type) {
    if (!this.socket || !this.connected || !articleId || !type) return;
    this.socket.emit('reactionUpdate', { articleId, type });
  }

  sendComment(articleId, content, userId) {
    if (!this.socket || !this.connected || !articleId || !content || !userId) return;
    this.socket.emit('newComment', { articleId, content, userId });
  }

  sendCommentUpdate(articleId, commentId, content) {
    if (!this.socket || !this.connected || !articleId || !commentId || !content) return;
    this.socket.emit('updateComment', { articleId, commentId, content });
  }

  sendCommentDelete(articleId, commentId) {
    if (!this.socket || !this.connected || !articleId || !commentId) return;
    this.socket.emit('deleteComment', { articleId, commentId });
  }
}

export default new WebSocketService();