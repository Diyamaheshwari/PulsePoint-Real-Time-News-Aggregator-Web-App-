// ─────────────────────────────────────────────────────────────
//  NewsSphere — Server Entry Point
// ─────────────────────────────────────────────────────────────
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

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
const { startAggregatorQueue } = require('./services/newsAggregatorQueue');

// Import routes
const authRoutes = require('./routes/authRoutes');
const newsRoutes = require('./routes/newsRoutes');
const localFeedRoutes = require('./routes/localFeedRoutes');
const commentRoutes = require('./routes/commentRoutes');
const moderationRoutes = require('./routes/moderationRoutes');
const newsInteractionRoutes = require('./routes/newsInteractionRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const hubRoutes = require('./routes/hubRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const communityRoutes = require('./routes/communityRoutes');
const aiPollRoutes = require('./routes/aiPollRoutes');
const thoughtRoutes = require('./routes/thoughtRoutes');
const pollRoutes = require('./routes/pollRoutes');

// Import models
const Poll = require('./models/Poll');

const app = express();
const server = http.createServer(app);

// ── WebSocket ──────────────────────────────────────────────────
const webSocketService = new WebSocketService(server);
require('./utils/websocket').setWebSocketService(webSocketService);
app.set('webSocketService', webSocketService);

// ── CORS ───────────────────────────────────────────────────────
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.CLIENT_URL]
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin === o || origin.startsWith(o.replace(/^https?:\/\//, 'http://')) || origin.startsWith(o.replace(/^https?:\/\//, 'https://')))) {
      callback(null, true);
    } else {
      console.log('CORS blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 'Authorization', 'X-Requested-With', 'X-Auth-Token',
    'x-auth-token', 'Cache-Control', 'Accept', 'X-CSRF-Token'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Auth-Token'],
  maxAge: 600
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// ── Body parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ── Rate limiting ──────────────────────────────────────────────
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── API routes ─────────────────────────────────────────────────
const API = '/api';

// Root endpoint redirect to Frontend in development
app.get('/', (_req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    return res.redirect('http://localhost:3000');
  }
  res.json({ message: 'NewsSphere API Server' });
});

// Chrome DevTools probe handler
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ status: 'ok' });
});

app.get(`${API}/health`, (_req, res) => {
  res.json({ status: 'ok', app: 'NewsSphere', timestamp: new Date().toISOString() });
});

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, authRoutes);
app.use(`${API}/news`, newsRoutes);
app.use(`${API}/local`, localFeedRoutes);
app.use(`${API}/comments`, commentRoutes);
app.use(`${API}/moderation`, moderationRoutes);
app.use(`${API}/news-interactions`, newsInteractionRoutes);
app.use(`${API}/weather`, weatherRoutes);
app.use(`${API}/community`, communityRoutes);
app.use(`${API}/ai-polls`, aiPollRoutes);
app.use(`${API}/thoughts`, thoughtRoutes);
app.use(`${API}/polls`, pollRoutes);
app.use(`${API}/hub`, hubRoutes);
app.use(`${API}/notifications`, notificationRoutes);

// ── Static assets (production) ─────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/dist/index.html'));
  });
}

// ── Error handler ──────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// ── Database ───────────────────────────────────────────────────
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB Connected…');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// ── Scheduled jobs ─────────────────────────────────────────────
const setupDailyPolls = async () => {
  schedule.scheduleJob('0 0 * * *', async () => {
    try {
      console.log('Running scheduled job: Generating daily polls…');
      await generateDailyPolls();
    } catch (error) {
      console.error('Error in daily poll generation:', error);
    }
  });

  if (process.env.NODE_ENV === 'development') {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const existing = await Poll.find({ createdAt: { $gte: today }, isDailyPoll: true });
      if (existing.length === 0) {
        console.log('Generating initial daily polls for development…');
        await generateDailyPolls();
      }
    } catch (error) {
      console.error('Error generating initial polls:', error);
    }
  }
};

const createAdminUser = async () => {
  if (process.env.NODE_ENV === 'development') {
    try {
      const User = require('./models/User');
      const admin = await User.findOne({ email: 'admin@newssphere.in' });
      if (!admin) {
        await User.create({
          username: 'admin',
          email: 'admin@newssphere.in',
          password: 'Admin@123',
          role: 'admin',
          onboardingCompleted: true
        });
        console.log('Admin user created: admin@newssphere.in');
      }
    } catch (error) {
      if (error.code === 11000) {
        // Admin already exists — nothing to do
      } else {
        console.error('Error creating admin user:', error);
      }
    }
  }
};

// ── Serverless DB Auto-Connect Middleware ──────────────────────
app.use(async (_req, _res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (_) {}
  }
  next();
});

const startServer = async () => {
  try {
    await connectDB();
    await setupDailyPolls();
    await createAdminUser();
    await startAggregatorQueue();

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`\n  ✦  NewsSphere server running on port ${PORT}`);
      console.log(`  ✦  Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;