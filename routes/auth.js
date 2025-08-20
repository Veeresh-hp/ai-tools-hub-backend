const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail, emailTemplates } = require('../utils/emailService');
const { OAuth2Client } = require('google-auth-library'); // Added for Google Auth

// Initialize Google Auth Client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- SIGNUP ---
router.post('/signup', async (req, res) => {
  const { email, username, password } = req.body;
  try {
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Please provide email, username, and password' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Email or username already exists' });
    }

    const user = new User({ email, username, password });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // ✅ Send welcome email after successful signup
    try {
      const welcomeMailOptions = emailTemplates.welcome(user.email, user.username);
      await sendEmail(welcomeMailOptions);
      console.log('✅ Welcome email sent to:', user.email);
    } catch (emailError) {
      console.error('❌ Failed to send welcome email:', emailError.message);
      // Don't fail the signup process if email fails
    }

    res.status(201).json({
      token,
      user: { email: user.email, username: user.username },
    });
  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// --- LOGIN ---
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  try {
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please provide username/email and password' });
    }

    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Check if user has a password (they might be a Google-only user)
    if (!user.password) {
        return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({
      token,
      user: { email: user.email, username: user.username },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// --- FORGOT PASSWORD ---
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      // IMPORTANT: For security, always send a generic success message
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }
    
    // Do not allow password reset for Google-only accounts
    if (!user.password) {
        return res.status(400).json({ error: 'Cannot reset password for an account created with Google. Please log in with Google.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    try {
      const mailOptions = emailTemplates.passwordReset(user.email, resetToken);
      await sendEmail(mailOptions);
      console.log('✅ Password reset email sent to:', user.email);
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError.message);
      // Clear token if email fails to prevent having an unusable token
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      return res.status(500).json({ error: 'An error occurred while attempting to send the reset email.' });
    }

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });

  } catch (error) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({ error: 'An error occurred.' });
  }
});

// --- RESET PASSWORD ---
router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;
    try {
        if (!token || !password) {
            return res.status(400).json({ error: 'Token and new password are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }

        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
        }

        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        try {
            const resetSuccessMailOptions = emailTemplates.resetSuccess(user.email, user.username);
            await sendEmail(resetSuccessMailOptions);
            console.log('✅ Password reset success email sent to:', user.email);
        } catch (emailError) {
            console.error('❌ Failed to send reset success email:', emailError.message);
        }

        const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ 
            message: 'Password has been successfully reset.',
            token: jwtToken,
            user: { email: user.email, username: user.username },
        });

    } catch (error) {
        console.error('Reset password error:', error.message);
        res.status(500).json({ error: 'An error occurred while resetting the password.' });
    }
});

// --- GOOGLE LOGIN (token-based GIS) ---
router.post('/google-login', async (req, res) => {
  try {
    const { token } = req.body; // ID token from frontend Google button
    if (!token) return res.status(400).json({ error: 'Google token missing' });

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    // sub = Google unique user ID
    const { sub: googleId, email, name, email_verified } = payload;

    if (!email_verified) {
      return res.status(400).json({ error: 'Google email not verified' });
    }

    // Try to find by email first (handles users who signed up with password earlier)
    let user = await User.findOne({ email });

    if (user) {
      // If user exists but doesn't have a googleId, link the account
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // If user doesn't exist, create a new one
      // Create a unique username from email or name
      const base = (name?.replace(/\W/g, '') || email.split('@')[0]).toLowerCase();
      let username = base;
      let exists = await User.exists({ username });
      // Loop to find a unique username
      while (exists) {
        username = `${base}${Math.floor(Math.random() * 10000)}`;
        exists = await User.exists({ username });
      }

      user = await User.create({
        email,
        username,
        googleId,
        // no password for Google users
      });
    }

    // Create a JWT token for the session
    const jwtToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // keep same as your email/password flow
    );

    res.json({
      token: jwtToken,
      user: { email: user.email, username: user.username },
    });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(500).json({ error: 'Google login failed' });
  }
});


module.exports = router;
