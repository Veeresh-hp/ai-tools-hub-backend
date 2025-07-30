// routes/newsletter.js
const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');
const { sendEmail, emailTemplates } = require('../utils/emailService');

// Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  console.log('📧 Newsletter subscription request received:', req.body);
  
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
    console.log('🔍 Checking if email already exists:', email);
    
    // Check if email already exists
    const existingSubscriber = await Subscriber.findOne({ email: email.toLowerCase() });
    
    if (existingSubscriber) {
      console.log('ℹ️ Email already subscribed:', email);
      return res.status(200).json({ 
        message: 'You are already subscribed to our newsletter!' 
      });
    }

    console.log('💾 Creating new subscriber for:', email);
    
    // Create new subscriber
    const subscriber = new Subscriber({ 
      email: email.toLowerCase() 
    });
    await subscriber.save();
    
    console.log('✅ Subscriber saved to database');

    // Send welcome email
    console.log('📧 Sending welcome email...');
    const mailOptions = emailTemplates.welcome(email);
    await sendEmail(mailOptions);
    
    console.log('✅ Welcome email sent successfully');

    res.status(201).json({ 
      message: 'Successfully subscribed! Check your email for confirmation.' 
    });

  } catch (error) {
    console.error('❌ Newsletter subscription error:', error);
    
    // Check if it's a duplicate key error (race condition)
    if (error.code === 11000) {
      return res.status(200).json({ 
        message: 'You are already subscribed to our newsletter!' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to subscribe. Please try again later.',
      details: error.message 
    });
  }
});

// Send newsletter to all subscribers (for admin use)
router.post('/send-update', async (req, res) => {
  console.log('📬 Newsletter update request received');
  
  const { subject, content, toolData } = req.body;

  try {
    const subscribers = await Subscriber.find({});
    console.log(`📊 Found ${subscribers.length} subscribers`);
    
    if (subscribers.length === 0) {
      return res.status(200).json({ message: 'No subscribers found' });
    }

    // Send to all subscribers
    const emailPromises = subscribers.map(subscriber => {
      let mailOptions;
      
      if (toolData) {
        // Send new tool notification
        mailOptions = emailTemplates.newTool({
          ...toolData,
          to: subscriber.email
        });
      } else {
        // Send custom newsletter
        mailOptions = {
          from: `"AI Tools Hub" <${process.env.EMAIL_USER}>`,
          to: subscriber.email,
          subject: subject || '📧 AI Tools Hub Newsletter',
          html: content || '<p>New update from AI Tools Hub!</p>'
        };
      }
      
      return sendEmail(mailOptions);
    });

    await Promise.all(emailPromises);
    console.log(`✅ Newsletter sent to ${subscribers.length} subscribers`);

    res.status(200).json({ 
      message: `Newsletter sent to ${subscribers.length} subscribers` 
    });

  } catch (error) {
    console.error('❌ Newsletter send error:', error);
    res.status(500).json({ 
      error: 'Failed to send newsletter',
      details: error.message 
    });
  }
});

// Get subscriber count (optional)
router.get('/count', async (req, res) => {
  try {
    const count = await Subscriber.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error('Error getting subscriber count:', error);
    res.status(500).json({ error: 'Failed to get subscriber count' });
  }
});

module.exports = router;