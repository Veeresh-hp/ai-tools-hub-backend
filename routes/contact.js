// routes/contact.js
const express = require('express');
const router = express.Router();
require('dotenv').config();

const { sendEmail, emailTemplates } = require('../utils/emailService');

router.post('/', async (req, res) => {
  console.log('Received body:', req.body); // 🧠 Debugging log

  const { name, email, message } = req.body;

  // Basic validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Use your reusable email service
    await sendEmail(emailTemplates.contactForm(name, email, message));
    res.json({ message: 'Email sent successfully!' });
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ error: 'Failed to send email. Try again later.' });
  }
});

module.exports = router;
