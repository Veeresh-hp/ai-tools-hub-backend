const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');
const { sendNewToolEmail } = require('../utils/emailService');

// Route to add a new tool and notify subscribers
router.post('/add-tool', async (req, res) => {
  const { name, description, link } = req.body;
  const tool = { name, description, link };

  try {
    const subscribers = await Subscriber.find({});
    await sendNewToolEmail(tool, subscribers);

    res.status(200).json({ message: '✅ New tool added and emails sent!' });
  } catch (error) {
    console.error('❌ Failed to notify subscribers:', error);
    res.status(500).json({ message: 'Failed to notify subscribers.' });
  }
});

module.exports = router;
