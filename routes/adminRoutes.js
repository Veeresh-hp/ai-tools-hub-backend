const express = require('express');
const router = express.Router();
const Tool = require('../models/Tool');
const { sendDigest } = require('../utils/scheduler');
const { auth, requireAdmin } = require('../middleware/auth');

// POST /api/admin/trigger-digest
// Body: { type: 'daily' | 'weekly' }
router.post('/trigger-digest', auth, requireAdmin, async (req, res) => {
    try {
        const { type } = req.body;
        console.log(`🔧 Admin triggering ${type} digest manually...`);

        let tools = [];
        let title = '';

        if (type === 'daily') {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            tools = await Tool.find({
                status: 'approved',
                approvedAt: { $gte: startOfDay }
            }).sort({ approvedAt: -1 });
            title = 'Daily Digest (Manual)';
        } else if (type === 'weekly') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            tools = await Tool.find({
                status: 'approved',
                approvedAt: { $gte: oneWeekAgo }
            }).sort({ approvedAt: -1 });
            title = 'Weekly Digest (Manual)';
        } else {
            return res.status(400).json({ error: 'Invalid type. Use "daily" or "weekly".' });
        }

        if (tools.length === 0) {
            return res.status(404).json({ message: 'No tools found for this period.' });
        }

        // Send digest (async, don't wait for all emails to return response)
        sendDigest(tools, title).catch(err => console.error('Manual digest error:', err));

        res.json({ 
            success: true, 
            message: `Triggered ${title} for ${tools.length} tools. Emails are sending in background.` 
        });

    } catch (err) {
        console.error('Trigger digest error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
