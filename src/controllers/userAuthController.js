const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User.js');
const generateToken = require('../utils/jwt.js');
const logger = require('../../logger.js');
require('dotenv').config();
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const sendVerificationLink = require("../middlewares/validateEmail");

// =========================
// REGISTER ACCOUNT
// =========================
exports.register = async (req, res) => {
  const { name, anonymousName, email, password, googleId, role, ...therapistData } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: 'Email is already in use' });
    }

    // Hash password 
    let hashedPassword = null;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      anonymousName: anonymousName?.toLowerCase(),
      googleId: googleId || null,
      role,
      ...therapistData,
    });

    await newUser.save();

   
    const token = generateToken(newUser._id, newUser.role, newUser.email);


    await sendVerificationLink.sendVerificationLink(newUser);

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      message: "User created successfully. Check email for verification link.",
    });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};
// =========================
// LOGIN (Unified)
// =========================
exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  if (!user.password) {
    return res.status(400).json({
      message:
        "This email was registered via Google. Please login with Google or reset your password.",
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

  const accessToken = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
  const refreshToken = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    message: "Login successful",
    token: accessToken,
    refreshToken,
    user,
  });
};

// =========================
// VERIFY CODE
// =========================

exports.verifyEmail = async (req, res) => {
  try {
    const { email, token } = req.query;
    if (!email || !token) {
      return res.status(400).json({ message: "Missing token or email" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.json({ message: "Already verified" });
    }

    if (
      !user.verificationTokenExpires ||
      Date.now() > user.verificationTokenExpires
    ) {
      return res
        .status(400)
        .json({ message: "Verification Link expired. Request a new one" });
    }

    const match = await bcrypt.compare(token, user.verificationToken || "");
    if (!match) {
      return res.status(400).json({ message: "Invalid Verification Link" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resendLink = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.isVerified) {
      return res.json({ message: "Already verified" });
    }

    await sendVerificationLink.sendVerificationLink(user);
    res.json({ message: "Verification Link resent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// =========================
// DELETE ACCOUNT
// =========================

exports.deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);

    res.json({ message: 'Your account has been deleted  ' });
  } catch (err) {
    logger.error(err)
    res.status(500).json({ message: 'Failed to delete account', error: err.message });
  }
};


// =========================
// TOKEN REFRESH
// =========================
exports.tokenRefresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token is required.' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    const newAccessToken = jwt.sign(
      { id: decoded.id, email: decoded.email },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(403).json({
      message: `Invalid refresh token provided: ${err.message}. Please log in again.`,
    });
  }
};
