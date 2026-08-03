/**
 * News Aggregation Queue — BullMQ-based background job
 *
 * Runs every 15 minutes to:
 *  1. Fetch headlines from NewsAPI (and GNews when key is available)
 *  2. De-duplicate against existing News documents
 *  3. Run sentiment analysis and credibility scoring
 *  4. Upsert enriched articles into MongoDB
 *
 * When BullMQ/Redis is unavailable, falls back to a node-schedule
 * cron job so the aggregator still works in a zero-dependency dev setup.
 */
const axios = require('axios');
const News = require('../models/News');
const sentimentService = require('./sentimentService');
const claimbusterService = require('./claimbusterService');

// ── Category mapping ───────────────────────────────────────────
const NEWSAPI_CATEGORIES = [
  'business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'
];

const COUNTRIES = ['us', 'in', 'gb', 'au'];
const COUNTRY_NAMES = { us: 'United States', in: 'India', gb: 'United Kingdom', au: 'Australia' };

const CATEGORY_MAP = {
  business: 'Business',
  entertainment: 'Entertainment',
  general: 'General',
  health: 'Health',
  science: 'Science',
  sports: 'Sports',
  technology: 'Technology'
};

// ── Core aggregation logic ─────────────────────────────────────
async function aggregateNews() {
  console.log('[Aggregator] Starting news aggregation run…');
  const apiKey = process.env.NEWSAPI_API_KEY;
  const baseUrl = process.env.NEWSAPI_BASE_URL || 'https://newsapi.org/v2';

  if (!apiKey) {
    console.warn('[Aggregator] NEWSAPI_API_KEY not set – skipping run');
    return { fetched: 0, saved: 0 };
  }

  let totalFetched = 0;
  let totalSaved = 0;

  for (const country of COUNTRIES) {
    for (const category of NEWSAPI_CATEGORIES) {
      try {
        let endpoint = `${baseUrl}/top-headlines`;
        let params = {
          pageSize: 20,
          apiKey
        };
        
        // NewsAPI free tier limits top-headlines country to 'us' only
        if (country === 'us') {
          params.country = 'us';
          params.category = category;
        } else {
          endpoint = `${baseUrl}/everything`;
          params.q = `${category} news ${COUNTRY_NAMES[country]}`;
          params.language = 'en';
          params.sortBy = 'publishedAt';
        }

        const { data } = await axios.get(endpoint, {
          params,
          timeout: 15000
        });

        if (!data.articles?.length) continue;

      for (const article of data.articles) {
        if (!article.url || !article.title) continue;
        totalFetched++;

        // Skip if we already stored this URL
        const exists = await News.findOne({ url: article.url }).lean();
        if (exists) continue;

        // Enrich with sentiment
        const textForAnalysis = `${article.title}. ${article.description || ''}`;
        const sentiment = sentimentService.analyze(textForAnalysis);

        // Enrich with credibility score (non-blocking)
        let factCheckScore = null;
        let factCheckLabel = 'Needs Verification';
        try {
          const credibility = await claimbusterService.checkCredibility(article.title);
          factCheckScore = credibility.score;
          factCheckLabel = credibility.label;
        } catch (_) { /* non-critical */ }

        try {
          await News.create({
            title: article.title,
            description: article.description || '',
            content: article.content || '',
            url: article.url,
            urlToImage: article.urlToImage || '',
            publishedAt: new Date(article.publishedAt || Date.now()),
            source: {
              id: article.source?.id || null,
              name: article.source?.name || 'Unknown'
            },
            category: CATEGORY_MAP[category] || 'General',
            language: 'en',
            country: country,
            sentiment: sentiment.label,
            sentimentScore: sentiment.score,
            factCheckScore,
            factCheckLabel
          });
          totalSaved++;
        } catch (err) {
          // Duplicate-key errors are fine – another worker may have inserted
          if (err.code !== 11000) {
            console.error('[Aggregator] Insert error:', err.message);
          }
        }
      }
      } catch (err) {
        console.error(`[Aggregator] Failed to fetch ${category} for ${country}:`, err.message);
      }
    }
  }

  // Also try GNews if key is available
  if (process.env.GNEWS_API_KEY) {
    const GNEWS_LANGS = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja'];
    for (const lang of GNEWS_LANGS) {
      try {
        const { data } = await axios.get('https://gnews.io/api/v4/top-headlines', {
          params: {
            token: process.env.GNEWS_API_KEY,
            lang: lang,
            max: 20
          },
          timeout: 15000
        });

        for (const article of (data.articles || [])) {
          if (!article.url || !article.title) continue;
          totalFetched++;

          const exists = await News.findOne({ url: article.url }).lean();
          if (exists) continue;

          const sentiment = sentimentService.analyze(`${article.title}. ${article.description || ''}`);

          try {
            await News.create({
              title: article.title,
              description: article.description || '',
              content: article.content || '',
              url: article.url,
              urlToImage: article.image || '',
              publishedAt: new Date(article.publishedAt || Date.now()),
              source: { id: null, name: article.source?.name || 'GNews' },
              category: 'General',
              language: lang,
              country: 'global',
              sentiment: sentiment.label,
              sentimentScore: sentiment.score
            });
            totalSaved++;
          } catch (err) {
            if (err.code !== 11000) console.error(`[Aggregator] GNews insert error (${lang}):`, err.message);
          }
        }
      } catch (err) {
        console.error(`[Aggregator] GNews fetch error (${lang}):`, err.message);
      }
    }
  }

  console.log(`[Aggregator] Done — fetched ${totalFetched}, saved ${totalSaved} new articles`);
  return { fetched: totalFetched, saved: totalSaved };
}

// ── BullMQ queue setup (with node-schedule fallback) ───────────
let queueStarted = false;

async function startAggregatorQueue() {
  if (queueStarted) return;
  queueStarted = true;

  try {
    // Pre-check Redis availability before creating BullMQ objects
    const { getRedisClient, getBullMQConnection } = require('../config/redis');
    const redis = await getRedisClient();

    if (redis._isStub) {
      throw new Error('Redis unavailable – using in-memory stub');
    }

    // Redis is alive – use BullMQ
    const { Queue, Worker } = require('bullmq');
    const connection = getBullMQConnection();

    const queue = new Queue('news-aggregation', { connection });
    
    // Add repeating job every 15 minutes
    await queue.add(
      'aggregate',
      {},
      {
        repeat: { every: 15 * 60 * 1000 }, // 15 minutes
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 20 }
      }
    );

    // Worker processes the job
    const worker = new Worker(
      'news-aggregation',
      async () => {
        await aggregateNews();
      },
      { connection, concurrency: 1 }
    );

    worker.on('completed', (job) => {
      console.log(`[BullMQ] Aggregation job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[BullMQ] Aggregation job ${job?.id} failed:`, err.message);
    });

    console.log('[BullMQ] News aggregation queue started (every 15 min)');
  } catch (err) {
    // Fallback to node-schedule
    console.warn('[Aggregator] BullMQ not available, using node-schedule:', err.message);
    const schedule = require('node-schedule');
    schedule.scheduleJob('*/15 * * * *', aggregateNews);
    console.log('[Scheduler] News aggregation scheduled via node-schedule (every 15 min)');
  }

  // Run once immediately on startup
  setTimeout(aggregateNews, 5000);
}

module.exports = { startAggregatorQueue, aggregateNews };
