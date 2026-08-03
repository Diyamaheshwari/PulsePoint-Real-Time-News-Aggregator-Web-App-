const jwt = require('jsonwebtoken');

class TokenService {
  constructor() {
    this.accessSecret = process.env.JWT_SECRET || 'access_secret_12345_newssphere_abc';
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh_secret_12345_newssphere_xyz';
    this.accessTokenExpiry = '15m'; // 15 minutes
    this.refreshTokenExpiry = '7d';  // 7 days
  }

  /**
   * Generates both Access and Refresh tokens for a user.
   * @param {Object} user 
   * @returns {{accessToken: string, refreshToken: string}}
   */
  generateTokens(user) {
    const payload = {
      id: user._id || user.id,
      username: user.username,
      role: user.role || 'user'
    };

    const accessToken = jwt.sign(payload, this.accessSecret, {
      expiresIn: this.accessTokenExpiry
    });

    const refreshToken = jwt.sign({ id: payload.id }, this.refreshSecret, {
      expiresIn: this.refreshTokenExpiry
    });

    return { accessToken, refreshToken };
  }

  /**
   * Verifies the Access token.
   * @param {string} token 
   * @returns {Object|null}
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.accessSecret);
    } catch (error) {
      return null;
    }
  }

  /**
   * Verifies the Refresh token.
   * @param {string} token 
   * @returns {Object|null}
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.refreshSecret);
    } catch (error) {
      return null;
    }
  }
}

module.exports = new TokenService();
