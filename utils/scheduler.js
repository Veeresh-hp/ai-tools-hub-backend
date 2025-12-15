const cron = require('node-cron');
const Tool = require('../models/Tool');
const Subscriber = require('../models/Subscriber');
const User = require('../models/User');
const { emailTemplates, sendEmail } = require('./emailService');

// Helper to send digest
const sendDigest = async (tools, title) => {
    if (!tools.length) return;

    console.log(`📧 Preparing ${title} with ${tools.length} tools...`);

    // Fetch subscribers and users
    const [subs, users] = await Promise.all([
        Subscriber.find({ isUnsubscribed: false }, 'email unsubscribeToken'),
        User.find({}, 'email')
    ]);

    // Create a unique set of recipients (Map ensures uniqueness by email)
    const recipients = new Map();

    // Add subscribers first
    subs.forEach(s => recipients.set(s.email, { email: s.email, unsubscribeToken: s.unsubscribeToken, type: 'subscriber' }));

    // Add/Overwrite with users (users might not have unsubscribeToken but are valid recipients)
    users.forEach(u => {
        // If user already exists as subscriber, keep the subscriber's token if available
        const existing = recipients.get(u.email);
        recipients.set(u.email, { 
            email: u.email, 
            unsubscribeToken: existing?.unsubscribeToken || null, 
            type: 'user' 
        });
    });

    const targetList = Array.from(recipients.values());

    const backendBase = process.env.BACKEND_URL || process.env.FRONTEND_URL || '';
    const frontendBase = process.env.FRONTEND_URL || 'https://myalltools.vercel.app';
    const DELAY_MS = 800; // Rate limit delay

    for (const recipient of targetList) {
        // Determine unsubscribe URL
        let unsubscribeUrl = '#'; // Fallback
        if (recipient.unsubscribeToken) {
            unsubscribeUrl = `${backendBase}/api/newsletter/unsubscribe/${recipient.unsubscribeToken}`;
        } else {
            // For registered users without a token, point to account settings
            unsubscribeUrl = `${frontendBase}/account/settings`;
        }

        const mail = emailTemplates.newToolDigest({
            recipientEmail: recipient.email,
            tools: tools.slice(0, 10), // Top 10 tools
            unsubscribeUrl
        });

        try {
            await sendEmail(mail);
            // Optionally update stats if they are a subscriber
            // const subDoc = subs.find(s => s.email === recipient.email);
            // if (subDoc) await Subscriber.updateOne({ _id: subDoc._id }, { $set: { lastSentAt: new Date() } });
        } catch (err) {
            console.error('Digest email failed for', recipient.email, err.message);
        }

        // Wait before next request
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    console.log(`✅ Sent ${title} to ${targetList.length} unique recipients`);
};

const initScheduler = () => {
    console.log('⏰ Scheduler initialized');

    // Daily Digest at 9 PM IST (21:00 Asia/Kolkata)
    cron.schedule('0 21 * * *', async () => {
        console.log('⏰ Running Daily Digest Job (IST)...');
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        try {
            const tools = await Tool.find({
                status: 'approved',
                approvedAt: { $gte: startOfDay }
            }).sort({ approvedAt: -1 });

            // Lowered threshold to 1 for better engagement
            if (tools.length >= 1) {
                await sendDigest(tools, 'Daily Digest');
            } else {
                console.log(`ℹ️ Daily digest skipped: ${tools.length} tools (min 1 required)`);
            }
        } catch (err) {
            console.error('❌ Daily digest job failed:', err.message);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    // Weekly Digest on Monday at 10 AM IST
    cron.schedule('0 10 * * 1', async () => {
        console.log('⏰ Running Weekly Digest Job (IST)...');
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        try {
            const tools = await Tool.find({
                status: 'approved',
                approvedAt: { $gte: oneWeekAgo }
            }).sort({ approvedAt: -1 });

            if (tools.length > 0) {
                await sendDigest(tools, 'Weekly Digest');
            } else {
                console.log('ℹ️ Weekly digest skipped: No tools found');
            }
        } catch (err) {
            console.error('❌ Weekly digest job failed:', err.message);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });
};

module.exports = { initScheduler, sendDigest };
