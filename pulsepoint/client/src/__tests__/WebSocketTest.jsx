import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketContext';

const WebSocketTest = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const socket = useWebSocket();

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log('✅ Connected to WebSocket server');
      addMessage('Connected to WebSocket server');
      
      // Join community room
      socket.emit('join', { room: 'community' });
      addMessage('Joining community room...');
    };

    const handleNewComment = (comment) => {
      addMessage(`New comment: ${JSON.stringify(comment, null, 2)}`);
    };

    const handleCommentUpdated = (update) => {
      addMessage(`Comment updated: ${JSON.stringify(update, null, 2)}`);
    };

    const handleCommentDeleted = (commentId) => {
      addMessage(`Comment deleted: ${commentId}`);
    };

    const handlePollUpdated = (poll) => {
      addMessage(`Poll updated: ${JSON.stringify(poll, null, 2)}`);
    };

    const handleError = (error) => {
      console.error('WebSocket error:', error);
      addMessage(`❌ Error: ${error.message || 'Unknown error'}`);
    };

    // Set up event listeners
    socket.on('connect', handleConnect);
    socket.on('newComment', handleNewComment);
    socket.on('commentUpdated', handleCommentUpdated);
    socket.on('commentDeleted', handleCommentDeleted);
    socket.on('pollUpdated', handlePollUpdated);
    socket.on('error', handleError);

    // Clean up
    return () => {
      socket.off('connect', handleConnect);
      socket.off('newComment', handleNewComment);
      socket.off('commentUpdated', handleCommentUpdated);
      socket.off('commentDeleted', handleCommentDeleted);
      socket.off('pollUpdated', handlePollUpdated);
      socket.off('error', handleError);
    };
  }, [socket]);

  const addMessage = (message) => {
    setMessages(prev => [...prev, { id: Date.now(), text: message }]);
  };

  const sendTestComment = () => {
    if (!socket) return;
    
    const testComment = {
      content: input || 'Test comment from WebSocket test',
      postId: 'test-post-123',
      userId: 'test-user-123'
    };
    
    socket.emit('newComment', testComment);
    addMessage(`Sent test comment: ${JSON.stringify(testComment, null, 2)}`);
    setInput('');
  };

  const sendTestVote = () => {
    if (!socket) return;
    
    const testVote = {
      pollId: 'test-poll-123',
      optionId: 'option-1'
    };
    
    socket.emit('voteOnPoll', testVote);
    addMessage(`Sent test vote: ${JSON.stringify(testVote, null, 2)}`);
  };

  return (
    <div style={styles.container}>
      <h2>WebSocket Connection Test</h2>
      
      <div style={styles.controls}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter test message"
          style={styles.input}
        />
        <button onClick={sendTestComment} style={styles.button}>
          Send Test Comment
        </button>
        <button onClick={sendTestVote} style={styles.button}>
          Send Test Vote
        </button>
      </div>
      
      <div style={styles.messages}>
        <h3>WebSocket Messages:</h3>
        {messages.length === 0 ? (
          <p>No messages yet. Connect to see WebSocket events.</p>
        ) : (
          <ul style={styles.messageList}>
            {messages.map(msg => (
              <li key={msg.id} style={styles.messageItem}>
                <pre>{msg.text}</pre>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div style={styles.status}>
        <h3>Connection Status:</h3>
        <p>Connected: {socket?.connected ? '✅' : '❌'}</p>
        <p>ID: {socket?.id || 'Not connected'}</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  controls: {
    margin: '20px 0',
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  input: {
    flex: 1,
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    minWidth: '200px'
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  messages: {
    margin: '20px 0',
    padding: '15px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    maxHeight: '400px',
    overflowY: 'auto',
    backgroundColor: '#f9f9f9'
  },
  messageList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  messageItem: {
    padding: '8px 0',
    borderBottom: '1px solid #eee',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  status: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f0f8ff',
    borderRadius: '4px',
    borderLeft: '4px solid #007bff'
  }
};

export default WebSocketTest;
