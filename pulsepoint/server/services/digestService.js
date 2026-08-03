const nodemailer = require('nodemailer');
const News = require('../models/News');

class DigestService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: parseInt(process.env.SMTP_PORT || '2525'),
      auth: {
        user: process.env.SMTP_USER || null,
        pass: process.env.SMTP_PASS || null
      }
    });
  }

  /**
   * Generates and sends a personalized daily morning digest email to a user.
   * @param {Object} user 
   * @returns {Promise<boolean>}
   */
  async sendDailyDigest(user) {
    if (!user || !user.email) return false;

    try {
      // Find top articles matching user's onboarding preferences
      const preferences = user.preferences && user.preferences.length > 0 
        ? user.preferences 
        : ['General'];

      const topArticles = await News.find({
        category: { $in: preferences },
        publishedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      })
      .sort({ engagementScore: -1, publishedAt: -1 })
      .limit(5);

      if (topArticles.length === 0) {
        console.log(`No new articles in the last 24h for ${user.email}'s preferences. Skipping digest.`);
        return false;
      }

      const htmlContent = this.buildEmailHTML(user, topArticles);

      // Verify SMTP credentials before sending
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await this.transporter.sendMail({
          from: '"NewsSphere Digest" <digest@newssphere.com>',
          to: user.email,
          subject: `☀️ Your Morning NewsSphere Digest - ${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`,
          html: htmlContent
        });
        console.log(`Successfully sent daily digest to ${user.email}`);
      } else {
        // Output digest mock to console in development
        console.log(`[SMTP MOCK] Digest prepared for ${user.email}:\nPreferences: ${preferences.join(', ')}\nArticles found: ${topArticles.length}`);
      }
      return true;
    } catch (error) {
      console.error(`Failed to send digest to ${user.email}:`, error);
      return false;
    }
  }

  buildEmailHTML(user, articles) {
    const articleItems = articles.map(art => `
      <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0;">
        <span style="display: inline-block; padding: 4px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; background-color: #ebf8ff; color: #2b6cb0; border-radius: 4px; margin-bottom: 8px;">
          ${art.category}
        </span>
        <h3 style="margin: 0 0 8px 0; font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a202c; font-size: 18px;">
          <a href="${art.url}" style="color: #2b6cb0; text-decoration: none;">${art.title}</a>
        </h3>
        <p style="margin: 0 0 12px 0; color: #4a5568; font-size: 14px; line-height: 1.5;">
          ${art.description || 'No description available.'}
        </p>
        <div style="font-size: 12px; color: #718096;">
          Source: <strong>${art.source.name}</strong> &bull; Sentiment: <strong style="color: ${art.sentiment === 'Positive' ? '#38a169' : art.sentiment === 'Negative' ? '#e53e3e' : '#4a5568'}">${art.sentiment}</strong>
        </div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Morning Digest</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f7fafc; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #ffffff; margin-top: 30px; margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <tr>
            <td bgcolor="#1a365d" style="padding: 40px 30px 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">NewsSphere</h1>
              <p style="color: #90cdf4; margin: 5px 0 0 0; font-size: 14px;">Your Personalized Daily Morning Digest</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px 40px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #2d3748;">
                Good morning, <strong>${user.username}</strong>! Based on your selected preferences (${user.preferences.join(', ')}), here are the top trending insights in your circle today:
              </p>
              
              <h2 style="font-size: 18px; color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 8px; margin-bottom: 24px;">Top Stories For You</h2>
              
              ${articleItems}
              
              <p style="margin: 30px 0 0 0; font-size: 13px; color: #718096; text-align: center; line-height: 1.5;">
                You are receiving this email because you subscribed to daily digests on NewsSphere.<br>
                <a href="http://localhost:3000/profile" style="color: #3182ce; text-decoration: underline;">Manage Preferences</a> &bull; <a href="#" style="color: #3182ce; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f7fafc" style="padding: 20px 30px 20px 30px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #e2e8f0;">
              &copy; ${new Date().getFullYear()} NewsSphere Inc. All rights reserved.
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
}

module.exports = new DigestService();
