// routes/newsletter.js
const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');
const { sendEmail, emailTemplates } = require('../utils/emailService');

// Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  console.log('📧 Subscription request received:', req.body);

  const { email } = req.body;

  if (!email) {
    console.log('❌ No email provided');
    return res.status(400).json({ error: 'Email is required' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log('❌ Invalid email format:', email);
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    console.log('🔍 Checking if already subscribed:', normalizedEmail);

    const existing = await Subscriber.findOne({ email: normalizedEmail });
    if (existing) {
      console.log('ℹ️ Already subscribed:', normalizedEmail);
      return res.status(200).json({
        message: 'You are already subscribed to our newsletter!',
      });
    }

    const newSubscriber = new Subscriber({ email: normalizedEmail });
    await newSubscriber.save();
    console.log('✅ New subscriber saved:', normalizedEmail);

    // Send welcome email
    const mailOptions = emailTemplates.welcome(normalizedEmail);
    await sendEmail(mailOptions);
    console.log('📨 Welcome email sent to:', normalizedEmail);

    res.status(201).json({
      message: 'Successfully subscribed! Check your email for confirmation.',
    });

  } catch (error) {
    console.error('❌ Error during subscription:', error);

    // Handle duplicate key error (possible race condition)
    if (error.code === 11000) {
      return res.status(200).json({
        message: 'You are already subscribed to our newsletter!',
      });
    }

    res.status(500).json({
      error: 'Failed to subscribe. Please try again later.',
      details: error.message,
    });
  }
});

// Send newsletter or new tool to all subscribers (admin only)
router.post('/send-update', async (req, res) => {
  console.log('📬 Newsletter update request received');

  const { subject, content, toolData } = req.body;

  try {
    const subscribers = await Subscriber.find({});
    console.log(`📊 Sending to ${subscribers.length} subscribers`);

    if (subscribers.length === 0) {
      return res.status(200).json({ message: 'No subscribers found' });
    }

    const emailJobs = subscribers.map(sub => {
      let mailOptions;

      if (toolData) {
        // New tool notification
        mailOptions = emailTemplates.newTool({
          ...toolData,
          to: sub.email,
        });
      } else {
        // General newsletter
        mailOptions = {
          from: `"AI Tools Hub" <${process.env.EMAIL_USER}>`,
          to: sub.email,
          subject: subject || '📧 AI Tools Hub Newsletter',
          html: content || '<p>New update from AI Tools Hub!</p>',
        };
      }

      return sendEmail(mailOptions);
    });

    await Promise.all(emailJobs);
    console.log(`✅ Newsletter sent to ${subscribers.length} users`);

    res.status(200).json({
      message: `Newsletter sent to ${subscribers.length} subscribers`,
    });

  } catch (error) {
    console.error('❌ Failed to send newsletter:', error);
    res.status(500).json({
      error: 'Failed to send newsletter',
      details: error.message,
    });
  }
});

// Get subscriber count (optional)
router.get('/count', async (req, res) => {
  try {
    const count = await Subscriber.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error('❌ Error getting subscriber count:', error);
    res.status(500).json({ error: 'Failed to get subscriber count' });
  }
});

module.exports = router;
