/**
 * Redis Configuration for NewsSphere
 * 
 * Provides a reusable Redis connection factory for BullMQ queues,
 * caching, and session storage. Falls back to an in-memory stub
 * if Redis is unavailable (development convenience).
 */
const { createClient } = require('redis');

let redisClient = null;
let isConnected = false;

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

/**
 * Returns a connected Redis client singleton.
 * If Redis is unreachable, returns a thin in-memory stub so the
 * rest of the application can still start in development.
 */
async function getRedisClient() {
  if (redisClient && isConnected) return redisClient;

  try {
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.warn('[Redis] Max retries reached – using in-memory stub');
            return false; // stop reconnecting
          }
          return Math.min(retries * 200, 2000);
        },
        connectTimeout: 5000
      }
    });

    redisClient.on('error', (err) => {
      if (isConnected) {
        console.warn('[Redis] Connection lost:', err.message);
      }
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully to', REDIS_URL);
      isConnected = true;
    });

    await redisClient.connect();
    return redisClient;
  } catch (err) {
    console.warn('[Redis] Could not connect – using in-memory stub:', err.message);
    redisClient = null;
    return createMemoryStub();
  }
}


/**
 * Minimal Map-based stub that exposes the same get/set/del interface
 * so callers don't need to branch on availability.
 */
function createMemoryStub() {
  const store = new Map();
  return {
    get: async (key) => store.get(key) ?? null,
    set: async (key, value, options) => {
      store.set(key, value);
      if (options?.EX) {
        setTimeout(() => store.delete(key), options.EX * 1000);
      }
    },
    del: async (key) => store.delete(key),
    isOpen: true,
    _isStub: true
  };
}

/**
 * BullMQ-compatible connection options object.
 * BullMQ uses ioredis under the hood, so we parse REDIS_URL into
 * host / port / password fields.
 */
function getBullMQConnection() {
  const url = new URL(REDIS_URL);
  return {
    host: url.hostname || '127.0.0.1',
    port: parseInt(url.port, 10) || 6379,
    password: url.password || undefined,
    maxRetriesPerRequest: null // required by BullMQ
  };
}

module.exports = { getRedisClient, getBullMQConnection };
