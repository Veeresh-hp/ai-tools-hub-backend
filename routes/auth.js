const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail, emailTemplates } = require('../utils/emailService');

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

    const isMatch = await bcrypt.compare(password, user.password);
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

    // IMPORTANT: For security, always send a generic success message
    // whether the user is found or not. This prevents email enumeration attacks.
    if (!user) {
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    // 1. Generate a raw token for the user's email link
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 2. Hash the token and save it to the database (more secure than saving the raw token)
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // 3. Set an expiration time (e.g., 10 minutes)
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    
    await user.save();

    // 4. Send the email with the *raw* token
    const mailOptions = emailTemplates.passwordReset(user.email, resetToken);
    sendEmail(mailOptions);

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });

  } catch (error) {
    console.error('Forgot password error:', error.message);
    // In case of error, don't reveal details to the client
    res.status(500).json({ error: 'An error occurred while attempting to send the reset email.' });
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

        // 1. Hash the incoming token from the user so we can find it in the DB
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // 2. Find the user by the hashed token and check if it's expired
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() } // $gt means "greater than"
        });

        if (!user) {
            return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
        }

        // 3. If the token is valid, update the user's password
        user.password = password;

        // 4. Clear the reset token fields
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;

        await user.save();

        // Optional: Log the user in immediately by sending a new JWT token
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


module.exports = router;

