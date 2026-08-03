const axios = require('axios');

class ClaimBusterService {
  constructor() {
    this.apiKey = process.env.CLAIMBUSTER_API_KEY || null;
    this.baseUrl = 'https://factcheckapi.com/v1/claimscore'; // Example endpoint
    
    // Weighted list of trusted media outlets
    this.sourceCredibility = {
      'reuters': 95,
      'ap': 95,
      'associated press': 95,
      'bbc': 90,
      'bloomberg': 90,
      'nytimes': 88,
      'new york times': 88,
      'npr': 88,
      'washington post': 85,
      'cnn': 75,
      'fox news': 60,
      'msnbc': 70,
      'techcrunch': 82,
      'wired': 85
    };
  }

  /**
   * Evaluates the credibility score of an article/text.
   * @param {string} sourceName 
   * @param {string} text 
   * @returns {Promise<{score: number, label: 'Verified' | 'Unverified' | 'Disputed' | 'Needs Verification'}>}
   */
  async checkCredibility(sourceName, text) {
    if (this.apiKey) {
      try {
        const response = await axios.post(
          this.baseUrl,
          { text },
          { headers: { 'x-api-key': this.apiKey } }
        );
        const apiScore = Math.round((response.data.score || 0.5) * 100);
        return {
          score: apiScore,
          label: this.getLabelForScore(apiScore)
        };
      } catch (error) {
        console.error('ClaimBuster API check failed, using fallback:', error.message);
      }
    }

    // Heuristic fallback based on source authority and keywords
    const score = this.calculateHeuristicScore(sourceName, text);
    return {
      score,
      label: this.getLabelForScore(score)
    };
  }

  calculateHeuristicScore(sourceName, text) {
    const src = (sourceName || '').toLowerCase().trim();
    let baseScore = 70; // Default baseline

    // Match source weight
    for (const [key, value] of Object.entries(this.sourceCredibility)) {
      if (src.includes(key)) {
        baseScore = value;
        break;
      }
    }

    // Adjust based on typical sensationalism phrases in text
    const sensationalPhrases = [
      'you won\'t believe', 'shocking truth', 'secret leaked', 'aliens', 'conspiracy', 'miracle cure', 'insane method'
    ];

    sensationalPhrases.forEach(phrase => {
      if (text && text.toLowerCase().includes(phrase)) {
        baseScore = Math.max(10, baseScore - 25);
      }
    });

    // Add slight deterministic variability based on title length or text hashing
    const modifier = (text ? text.length % 9 : 0) - 4;
    return Math.min(100, Math.max(0, baseScore + modifier));
  }

  getLabelForScore(score) {
    if (score >= 85) return 'Verified';
    if (score >= 65) return 'Unverified'; // Claim is unverified but not debunked
    if (score >= 40) return 'Needs Verification';
    return 'Disputed';
  }
}

module.exports = new ClaimBusterService();
