/**
 * Passport.js Configuration for NewsSphere
 * 
 * Configures Google OAuth 2.0 strategy (and Apple placeholder).
 * Credentials are sourced from environment variables; if missing
 * the strategy is simply not registered, which keeps the app
 * bootable during local development without OAuth keys.
 */
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// ── Serialisation ──────────────────────────────────────────────
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ── Google OAuth 2.0 ───────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
        scope: ['profile', 'email']
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('Google profile has no email'), null);

          // Check for existing user
          let user = await User.findOne({ email });

          if (user) {
            // Link Google profile if not already linked
            if (!user.googleId) {
              user.googleId = profile.id;
              user.avatar = user.avatar || profile.photos?.[0]?.value || '';
              await user.save();
            }
            return done(null, user);
          }

          // Create a new user from Google profile
          user = await User.create({
            username: email.split('@')[0] + '_' + Date.now().toString(36),
            email,
            password: require('crypto').randomBytes(32).toString('hex'),
            googleId: profile.id,
            avatar: profile.photos?.[0]?.value || '',
            onboardingCompleted: false,
            role: 'user'
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
  console.log('[Passport] Google OAuth strategy registered');
} else {
  console.log('[Passport] Google OAuth credentials not set – strategy skipped');
}

// ── Apple OAuth (Placeholder) ──────────────────────────────────
// When APPLE_CLIENT_ID & APPLE_TEAM_ID are configured, register
// the apple strategy here using passport-apple.

module.exports = passport;
