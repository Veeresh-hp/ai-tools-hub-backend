// routes/newsletter.js
const express = require('express');
const { Subscriber, sendEmail, emailTemplates } = require('../utils/emailService');
const router = express.Router();

// --- Helper function for email validation ---
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

// --- POST /api/newsletter/subscribe ---
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Validate the email
    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.'
      });
    }

    // 2. Check if the user is already subscribed
    const existingSubscriber = await Subscriber.findOne({ email: email.toLowerCase() });

    if (existingSubscriber) {
      // 2a. If they are already active, just send a success message
      if (existingSubscriber.isActive) {
        return res.status(200).json({
          success: true,
          message: 'You are already subscribed to our newsletter!'
        });
      } else {
        // 2b. If they were inactive, reactivate their subscription
        existingSubscriber.isActive = true;
        existingSubscriber.subscribedAt = new Date();
        await existingSubscriber.save();
        
        // Send a "welcome back" email
        const welcomeEmail = emailTemplates.welcome(email);
        await sendEmail(welcomeEmail);

        return res.status(200).json({
          success: true,
          message: 'Welcome back! Your subscription has been reactivated.'
        });
      }
    }

    // 3. Handle a brand new subscription
    const newSubscriber = new Subscriber({ email: email.toLowerCase() });
    await newSubscriber.save();

    // Send the initial welcome email
    const welcomeEmail = emailTemplates.welcome(email);
    await sendEmail(welcomeEmail);

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed! Please check your email for a confirmation.'
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    // Handle potential database errors (like a race condition for duplicates)
    if (error.code === 11000) {
        return res.status(400).json({ success: false, error: 'This email address is already subscribed.' });
    }
    res.status(500).json({
      success: false,
      error: 'An internal server error occurred. Please try again later.'
    });
  }
});

// --- POST /api/newsletter/unsubscribe ---
router.post('/unsubscribe', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !validateEmail(email)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Please provide a valid email address.' 
            });
        }

        const subscriber = await Subscriber.findOne({ email: email.toLowerCase() });

        if (!subscriber) {
            // Even if not found, we can send a "success" to not reveal who is in the list
            return res.status(200).json({ 
                success: true, 
                message: 'If this email was subscribed, it has been removed.' 
            });
        }

        subscriber.isActive = false;
        await subscriber.save();

        res.status(200).json({ 
            success: true, 
            message: 'You have been successfully unsubscribed.' 
        });

    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'An internal server error occurred. Please try again later.' 
        });
    }
});

module.exports = router;