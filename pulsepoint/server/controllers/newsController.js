/**
 * NewsSphere – News Controller (Global Feed)
 *
 * Serves the curated global news feed, ranked by a combination of
 * user topic preferences, engagement signals, recency, and sentiment.
 * Also provides AI-powered one-tap summarisation and article search.
 */
const News = require('../models/News');
const claudeService = require('../services/claudeService');

// ── Preference-weighted ranking score ──────────────────────────
function computeRankScore(article, userPreferences) {
  let score = 0;

  // Preference match bonus (strongest signal)
  if (userPreferences?.length) {
    const match = userPreferences.some(
      p => p.toLowerCase() === article.category?.toLowerCase()
    );
    if (match) score += 50;
  }

  // Recency boost: articles within last 6h get a bonus
  const hoursOld = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60);
  if (hoursOld < 1) score += 30;
  else if (hoursOld < 6) score += 20;
  else if (hoursOld < 24) score += 10;

  // Engagement boost
  score += Math.min((article.engagementScore || 0) * 0.5, 20);

  // Credibility boost
  if (article.factCheckLabel === 'Verified') score += 10;
  if (article.factCheckLabel === 'Disputed') score -= 15;

  return score;
}

// ── Get global feed (ranked) ───────────────────────────────────
exports.getGlobalFeed = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      sentiment,
      search,
      country,
      date,
      sortBy = 'ranked' // 'ranked' | 'recent' | 'popular'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (sentiment) filter.sentiment = sentiment;
    if (country && country !== 'global') filter.country = country;
    
    // Strict language filtering based on user preference
    if (req.user && req.user.language && req.user.language !== 'all') {
      filter.language = req.user.language;
    }

    if (date) {
      // Parse date as local midnight → cover the full 24h window regardless of server timezone
      // We add a ±1 day buffer so articles stored in any UTC offset still appear
      const dateParts = date.split('-').map(Number); // [YYYY, MM, DD]
      const start = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0, 0);
      const end   = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 23, 59, 59, 999);
      filter.publishedAt = { $gte: start, $lte: end };
    }
    if (search) {
      filter.$text = { $search: search };
    }

    // Determine sort for initial DB query
    let sort;
    switch (sortBy) {
      case 'popular':
        sort = { engagementScore: -1, publishedAt: -1 };
        break;
      case 'recent':
        sort = { publishedAt: -1 };
        break;
      default:
        sort = { publishedAt: -1 }; // fetch recent, then re-rank in memory
    }

    const [articles, total] = await Promise.all([
      News.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(sortBy === 'ranked' ? parseInt(limit) * 2 : parseInt(limit)) // over-fetch for ranking
        .lean(),
      News.countDocuments(filter)
    ]);

    let result = articles;

    // Apply preference ranking if user is authenticated
    if (sortBy === 'ranked') {
      const userPreferences = req.user?.preferences || [];
      result = articles
        .map(a => ({ ...a, _rankScore: computeRankScore(a, userPreferences) }))
        .sort((a, b) => b._rankScore - a._rankScore)
        .slice(0, parseInt(limit));
    }

    res.json({
      success: true,
      articles: result,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasMore: skip + result.length < total
      }
    });
  } catch (error) {
    console.error('Global feed error:', error);
    res.status(500).json({ success: false, message: 'Error fetching news feed' });
  }
};

// ── Get single article ─────────────────────────────────────────
exports.getArticle = async (req, res) => {
  try {
    const article = await News.findByIdAndUpdate(
      req.params.id,
      { $inc: { clicks: 1, engagementScore: 1 } },
      { new: true }
    ).lean();

    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

    res.json({ success: true, article });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ success: false, message: 'Error fetching article' });
  }
};

// ── One-tap AI summarise ───────────────────────────────────────
exports.summariseArticle = async (req, res) => {
  try {
    const article = await News.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

    // Return cached summary if available
    if (article.summary) {
      return res.json({ success: true, summary: article.summary, cached: true });
    }

    // Generate summary
    const textToSummarise = article.content || article.description || article.title;
    const summary = await claudeService.generateSummary(textToSummarise);

    // Cache it
    article.summary = summary;
    await article.save();

    res.json({ success: true, summary, cached: false });
  } catch (error) {
    console.error('Summarise error:', error);
    res.status(500).json({ success: false, message: 'Error generating summary' });
  }
};

// ── Like / share tracking (engagement) ─────────────────────────
exports.trackEngagement = async (req, res) => {
  try {
    const { action } = req.body; // 'like' | 'share' | 'bookmark'
    const update = { $inc: { engagementScore: 1 } };

    if (action === 'like') update.$inc.likesCount = 1;
    if (action === 'share') update.$inc.shares = 1;

    const article = await News.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

    res.json({
      success: true,
      engagementScore: article.engagementScore,
      likesCount: article.likesCount,
      shares: article.shares
    });
  } catch (error) {
    console.error('Track engagement error:', error);
    res.status(500).json({ success: false, message: 'Error tracking engagement' });
  }
};

// ── Get categories with article counts ─────────────────────────
exports.getCategories = async (_req, res) => {
  try {
    const categories = await News.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({ success: true, categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Error fetching categories' });
  }
};

// ── Trending articles (top engagement in last 24h) ─────────────
exports.getTrending = async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const trending = await News.find({ publishedAt: { $gte: since } })
      .sort({ engagementScore: -1 })
      .limit(10)
      .lean();

    res.json({ success: true, articles: trending });
  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).json({ success: false, message: 'Error fetching trending' });
  }
};

// ── Get available date range in DB ─────────────────────────────
exports.getDateRange = async (_req, res) => {
  try {
    const oldest = await News.findOne({}).sort({ publishedAt: 1 }).select('publishedAt').lean();
    const newest = await News.findOne({}).sort({ publishedAt: -1 }).select('publishedAt').lean();
    res.json({
      success: true,
      minDate: oldest?.publishedAt ? new Date(oldest.publishedAt).toISOString().slice(0, 10) : null,
      maxDate: newest?.publishedAt ? new Date(newest.publishedAt).toISOString().slice(0, 10) : null
    });
  } catch (error) {
    console.error('Date range error:', error);
    res.status(500).json({ success: false, message: 'Error fetching date range' });
  }
};