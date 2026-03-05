// Load environment variables first
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Import dependencies
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const schedule = require('node-schedule');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

// Import services
const WebSocketService = require('./services/websocketService');
const { generateDailyPolls } = require('./services/aiPollService');

// Import routes
const authRoutes = require('./routes/authRoutes');
const newsRoutes = require('./routes/newsRoutes');
const newsInteractionRoutes = require('./routes/newsInteractionRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const communityRoutes = require('./routes/communityRoutes');
const aiPollRoutes = require('./routes/aiPollRoutes');
const thoughtRoutes = require('./routes/thoughtRoutes');
const pollRoutes = require('./routes/pollRoutes');

// Import models
const Poll = require('./models/Poll');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket service
const webSocketService = new WebSocketService(server);
require('./utils/websocket').setWebSocketService(webSocketService);

// Make WebSocket service available to routes
app.set('webSocketService', webSocketService);

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [process.env.CLIENT_URL]
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests, or server-to-server)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowedOrigin => 
      origin === allowedOrigin || 
      origin.startsWith(allowedOrigin.replace(/^https?:\/\//, 'http://')) ||
      origin.startsWith(allowedOrigin.replace(/^https?:\/\//, 'https://'))
    )) {
      callback(null, true);
    } else {
      console.log('CORS blocked request from origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Auth-Token',
    'x-auth-token',
    'Cache-Control',
    'Pragma',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
    'Connection',
    'Host',
    'Origin',
    'Referer',
    'User-Agent',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Methods',
    'X-Requested-With',
    'Accept',
    'X-Auth-Token',
    'x-auth-token',
    'X-CSRF-Token',
    'x-csrf-token'
  ],
  exposedHeaders: [
    'Content-Range', 
    'X-Content-Range',
    'X-Auth-Token',
    'x-auth-token'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  optionsSuccessStatus: 204, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  preflightContinue: false, // Let CORS middleware handle preflight responses
  maxAge: 600 // Cache preflight requests for 10 minutes
};

// Handle preflight requests first
app.options('*', cors(corsOptions));

// Then apply CORS to all routes
app.use(cors(corsOptions));

// Add headers before the routes are defined
app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  
  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,authorization');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});

// Middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Apply more aggressive rate limiting to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// API Routes with versioning
const API_PREFIX = '/api';

// Health check endpoint
app.get(`${API_PREFIX}/health`, (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount API routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/news`, newsRoutes);
app.use(`${API_PREFIX}/news-interactions`, newsInteractionRoutes);
app.use(`${API_PREFIX}/weather`, weatherRoutes);
app.use(`${API_PREFIX}/community`, communityRoutes);
app.use(`${API_PREFIX}/ai-polls`, aiPollRoutes);
app.use(`${API_PREFIX}/thoughts`, thoughtRoutes);
app.use(`${API_PREFIX}/polls`, pollRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// Schedule daily poll generation
const setupDailyPolls = async () => {
  // Schedule to run every day at midnight
  schedule.scheduleJob('0 0 * * *', async () => {
    try {
      console.log('Running scheduled job: Generating daily polls...');
      await generateDailyPolls();
      console.log('Successfully generated daily polls');
    } catch (error) {
      console.error('Error in daily poll generation job:', error);
    }
  });

  // Also generate polls immediately if in development
  if (process.env.NODE_ENV === 'development') {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingPolls = await Poll.find({
        createdAt: { $gte: today },
        isDailyPoll: true
      });

      if (existingPolls.length === 0) {
        console.log('Generating initial set of daily polls for development...');
        await generateDailyPolls();
      }
    } catch (error) {
      console.error('Error generating initial polls for development:', error);
    }
  }
};

// Create admin user if it doesn't exist (for development)
const createAdminUser = async () => {
  if (process.env.NODE_ENV === 'development') {
    try {
      const { createAdmin } = require('./controllers/authController');
      const req = { 
        body: { 
          email: 'admin@pulsepoint.in',
          password: 'Admin@123',
          username: 'admin' 
        } 
      };
      const res = {
        status: (code) => ({
          json: (data) => console.log('Admin user check:', data)
        })
      };
      
      await createAdmin(req, res, () => {});
    } catch (error) {
      console.error('Error creating admin user:', error);
    }
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDB();
    await setupDailyPolls();
    await createAdminUser();
    
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Start the server
startServer();