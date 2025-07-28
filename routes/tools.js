const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');
const { sendEmail, emailTemplates } = require('../utils/emailService');

// Sample route to add a new tool and notify
router.post('/add', async (req, res) => {
  const { name, description, category, url } = req.body;

  if (!name || !description || !url) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const toolData = { name, description, category, url };

  try {
    // Save tool to DB if needed
    // await Tool.create(toolData);

    // Send notification to all subscribers
    const subscribers = await Subscriber.find({});
    for (const sub of subscribers) {
      await sendEmail({ ...emailTemplates.newTool(toolData), to: sub.email });
    }

    res.status(200).json({ message: 'Tool added and emails sent!' });
  } catch (err) {
    console.error('Tool Add Error:', err.message);
    res.status(500).json({ message: 'Failed to notify subscribers' });
  }
});

module.exports = router;
