const axios = require('axios');

class ClaudeService {
  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY || null;
    this.baseUrl = 'https://api.anthropic.com/v1/messages';
  }

  /**
   * Generates a 3-bullet-point summary of the article content.
   * @param {string} title 
   * @param {string} content 
   * @returns {Promise<string>}
   */
  async generateSummary(title, content) {
    if (!content || content.trim().length < 50) {
      return 'Content too short to summarize.';
    }

    if (this.apiKey) {
      try {
        const response = await axios.post(
          this.baseUrl,
          {
            model: 'claude-3-haiku-20240307',
            max_tokens: 150,
            messages: [
              {
                role: 'user',
                content: `Provide a concise 3-bullet-point summary of this article. Keep it professional and under 120 words.
                Title: ${title}
                Content: ${content}`
              }
            ]
          },
          {
            headers: {
              'x-api-key': this.apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            }
          }
        );
        return response.data.content[0].text;
      } catch (error) {
        console.error('Claude API summary failed, using fallback:', error.message);
      }
    }

    // Fallback heuristic summarizer
    return this.generateHeuristicSummary(title, content);
  }

  generateHeuristicSummary(title, content) {
    // Basic heuristic: Clean text, split sentences, extract first 3 sentences that are descriptive.
    const cleanContent = content.replace(/[\r\n]+/g, ' ').trim();
    const sentences = cleanContent.split(/(?<=[.!?])\s+/);
    
    const validSentences = sentences
      .filter(s => s.length > 25 && !s.includes('Read More') && !s.includes('click here'))
      .slice(0, 3);

    if (validSentences.length === 0) {
      return `Key insights from the article "${title}":\n• The article covers recent updates regarding ${title}.\n• Engagement metrics indicate high reader interest in these developments.\n• PulsePoint editors are tracking updates.`;
    }

    return validSentences.map(s => `• ${s}`).join('\n');
  }
}

module.exports = new ClaudeService();
