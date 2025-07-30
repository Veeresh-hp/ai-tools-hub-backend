// routes/contact.js
const express = require('express');
const router = express.Router();
const { sendEmail, emailTemplates } = require('../utils/emailService');

router.post('/', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const mailOptions = emailTemplates.contactForm(name, email, message);
    await sendEmail(mailOptions);
    res.status(200).json({ message: 'Message sent successfully! We will get back to you shortly.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
});

module.exports = router;