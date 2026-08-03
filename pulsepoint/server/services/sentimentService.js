class SentimentService {
  constructor() {
    this.positiveWords = new Set([
      'succeed', 'success', 'successful', 'breakthrough', 'innovative', 'progress', 'growth', 'gain', 'positive', 
      'achieve', 'achievement', 'win', 'winner', 'victory', 'rising', 'improve', 'improvement', 'benefit', 'beneficial',
      'happy', 'glad', 'wonderful', 'excellent', 'outstanding', 'best', 'good', 'love', 'support', 'trust', 'strong',
      'boost', 'recovery', 'heal', 'healthy', 'secure', 'optimistic', 'hope', 'hopeful', 'pleased', 'delight'
    ]);

    this.negativeWords = new Set([
      'fail', 'failure', 'failed', 'crash', 'drop', 'decline', 'loss', 'lose', 'lost', 'negative', 'worry', 'worried',
      'scare', 'scared', 'fear', 'crisis', 'disaster', 'tragic', 'tragedy', 'death', 'die', 'dead', 'kill', 'murder',
      'warn', 'warning', 'risk', 'dangerous', 'danger', 'hurt', 'pain', 'suffer', 'suffering', 'damage', 'destroy',
      'protest', 'riot', 'clash', 'strike', 'arrest', 'charge', 'fraud', 'corrupt', 'corruption', 'scam', 'abuse'
    ]);
  }

  /**
   * Analyzes the sentiment of a given text.
   * @param {string} text 
   * @returns {{sentiment: 'Positive' | 'Neutral' | 'Negative', score: number}}
   */
  analyze(text) {
    if (!text || typeof text !== 'string') {
      return { sentiment: 'Neutral', score: 0 };
    }

    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    let score = 0;

    words.forEach(word => {
      if (this.positiveWords.has(word)) {
        score += 1;
      } else if (this.negativeWords.has(word)) {
        score -= 1;
      }
    });

    let sentiment = 'Neutral';
    if (score > 1) {
      sentiment = 'Positive';
    } else if (score < -1) {
      sentiment = 'Negative';
    }

    return { sentiment, score };
  }
}

module.exports = new SentimentService();
