const io = require('socket.io-client');

// Replace with your server URL
const SOCKET_URL = 'http://localhost:5000';

// Test with a valid JWT token (you'll need to get one from your auth system)
const TEST_TOKEN = 'YOUR_TEST_JWT_TOKEN';

// Create a socket connection
const socket = io(SOCKET_URL, {
  auth: {
    token: TEST_TOKEN
  },
  transports: ['websocket']
});

// Test connection
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  
  // Test authentication
  socket.emit('authenticate', { token: TEST_TOKEN });
});

// Handle authentication success
socket.on('authenticated', () => {
  console.log('✅ Successfully authenticated');
  
  // Test joining community room
  socket.emit('join', { room: 'community' });
  console.log('Attempting to join community room...');
});

// Test receiving new comments
socket.on('newComment', (comment) => {
  console.log('\n📨 New comment received:', comment);
});

// Test receiving comment updates
socket.on('commentUpdated', (update) => {
  console.log('\n🔄 Comment updated:', update);
});

// Test receiving comment deletions
socket.on('commentDeleted', (commentId) => {
  console.log('\n🗑️ Comment deleted:', commentId);
});

// Test receiving poll updates
socket.on('pollUpdated', (poll) => {
  console.log('\n📊 Poll updated:', poll);
});

// Handle errors
socket.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('\n🔌 Disconnected from server. Reason:', reason);
});

// Keep the connection alive
process.stdin.resume();

// Test sending a new comment (uncomment to test)
// setTimeout(() => {
//   console.log('\nSending test comment...');
//   socket.emit('newComment', {
//     content: 'This is a test comment',
//     postId: 'test-post-123'
//   });
// }, 2000);

// Test voting on a poll (uncomment to test)
// setTimeout(() => {
//   console.log('\nSending test vote...');
//   socket.emit('voteOnPoll', {
//     pollId: 'test-poll-123',
//     optionId: 'option-1'
//   });
// }, 4000);

console.log('WebSocket test client started. Press Ctrl+C to exit.');
