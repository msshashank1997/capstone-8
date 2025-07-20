const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');
const logger = require('../utils/logger');

module.exports = function(passport) {
  // JWT Strategy for API authentication
  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
    jsonWebTokenOptions: {
      maxAge: process.env.JWT_EXPIRE || '7d'
    }
  }, async (payload, done) => {
    try {
      const user = await User.findById(payload.id).select('-password');
      
      if (user && user.isActive) {
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        return done(null, user);
      }
      
      return done(null, false);
    } catch (error) {
      logger.error('JWT Strategy error:', error);
      return done(error, false);
    }
  }));

  // Google OAuth Strategy
  if (process.env.OAUTH_GOOGLE_CLIENT_ID && process.env.OAUTH_GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.OAUTH_GOOGLE_CLIENT_ID,
      clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
      scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await User.findByOAuthId('google', profile.id);
        
        if (user) {
          // Update last login
          user.lastLogin = new Date();
          await user.save();
          return done(null, user);
        }
        
        // Check if user exists with the same email
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          user.isVerified = true;
          user.lastLogin = new Date();
          
          // Update profile picture if not set
          if (!user.profilePicture && profile.photos && profile.photos[0]) {
            user.profilePicture = profile.photos[0].value;
          }
          
          await user.save();
          return done(null, user);
        }
        
        // Create new user
        const newUser = new User({
          googleId: profile.id,
          email: profile.emails[0].value,
          firstName: profile.name.givenName || 'Unknown',
          lastName: profile.name.familyName || 'User',
          profilePicture: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
          isVerified: true,
          lastLogin: new Date()
        });
        
        await newUser.save();
        logger.info(`New user created via Google OAuth: ${newUser.email}`);
        
        return done(null, newUser);
      } catch (error) {
        logger.error('Google OAuth error:', error);
        return done(error, null);
      }
    }));
  }

  // GitHub OAuth Strategy
  if (process.env.OAUTH_GITHUB_CLIENT_ID && process.env.OAUTH_GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
      clientID: process.env.OAUTH_GITHUB_CLIENT_ID,
      clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
      callbackURL: '/api/auth/github/callback',
      scope: ['user:email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this GitHub ID
        let user = await User.findByOAuthId('github', profile.id);
        
        if (user) {
          // Update last login
          user.lastLogin = new Date();
          await user.save();
          return done(null, user);
        }
        
        // Get primary email from GitHub
        const primaryEmail = profile.emails && profile.emails.find(email => email.primary);
        const email = primaryEmail ? primaryEmail.value : profile.emails[0]?.value;
        
        if (!email) {
          return done(new Error('No email found in GitHub profile'), null);
        }
        
        // Check if user exists with the same email
        user = await User.findOne({ email: email });
        
        if (user) {
          // Link GitHub account to existing user
          user.githubId = profile.id;
          user.isVerified = true;
          user.lastLogin = new Date();
          
          // Update profile picture if not set
          if (!user.profilePicture && profile.photos && profile.photos[0]) {
            user.profilePicture = profile.photos[0].value;
          }
          
          await user.save();
          return done(null, user);
        }
        
        // Create new user
        const newUser = new User({
          githubId: profile.id,
          email: email,
          firstName: profile.displayName ? profile.displayName.split(' ')[0] : profile.username,
          lastName: profile.displayName ? profile.displayName.split(' ').slice(1).join(' ') || 'User' : 'User',
          profilePicture: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
          isVerified: true,
          lastLogin: new Date()
        });
        
        await newUser.save();
        logger.info(`New user created via GitHub OAuth: ${newUser.email}`);
        
        return done(null, newUser);
      } catch (error) {
        logger.error('GitHub OAuth error:', error);
        return done(error, null);
      }
    }));
  }

  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select('-password');
      done(null, user);
    } catch (error) {
      logger.error('Deserialize user error:', error);
      done(error, null);
    }
  });
};
