const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const emailQueue = require('../../queue');
require('dotenv').config();

const router = express.Router();
console.log(`clientID:`, process.env.GOOGLE_CLIENT_ID)
console.log(`clientSecret:`, process.env.GOOGLE_CLIENT_SECRET)


// Passport Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
        } else {
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            avatar: profile.photos[0].value,
            password: null, 
          });
          console.log(`New Google user created: ${user.email}`);
          console.log('Adding welcome email job to queue...');
          await emailQueue.add("send-welcome-email", { email: user.email });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);


// Starting Google OAuth
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);


// Google callback route
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      message: 'Login successful',
      token,
      user: req.user,
    });
  }
);

module.exports = router;
