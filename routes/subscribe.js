const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');
const { sendEmail, emailTemplates } = require('../utils/emailService');

// Subscribe API
router.post('/', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  try {
    const existing = await Subscriber.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Already subscribed.' });

    const subscriber = new Subscriber({ email });
    await subscriber.save();

    await sendEmail(emailTemplates.welcome(email));
    res.status(200).json({ message: 'Successfully subscribed!' });
  } catch (err) {
    console.error('Subscribe error:', err.message);
    res.status(500).json({ message: 'Subscription failed.' });
  }
});

module.exports = router;
