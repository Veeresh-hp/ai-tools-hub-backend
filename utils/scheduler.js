const cron = require('node-cron');
const Tool = require('../models/Tool');
const Subscriber = require('../models/Subscriber');
const User = require('../models/User');
const { emailTemplates, sendEmail } = require('./emailService');

// Helper to send digest
const sendDigest = async (tools, title) => {
    if (!tools.length) return;

    console.log(`📧 Preparing ${title} with ${tools.length} tools...`);

    // Fetch subscribers (exclude unsubscribed and registered users)
    const [subs, users] = await Promise.all([
        Subscriber.find({ isUnsubscribed: false }, 'email unsubscribeToken'),
        User.find({}, 'email')
    ]);
    const userEmailSet = new Set(users.map(u => u.email));
    const targetSubs = subs.filter(s => !userEmailSet.has(s.email));

    const backendBase = process.env.BACKEND_URL || process.env.FRONTEND_URL || '';
    const DELAY_MS = 800; // Rate limit delay

    for (const sub of targetSubs) {
        const unsubscribeUrl = `${backendBase}/api/newsletter/unsubscribe/${sub.unsubscribeToken}`;
        const mail = emailTemplates.newToolDigest({
            recipientEmail: sub.email,
            tools: tools.slice(0, 10), // Top 10 tools
            unsubscribeUrl
        });

        // Override subject if needed, or rely on template default
        // mail.subject = `${title}: ${tools.length} New AI Tools`;

        try {
            await sendEmail(mail);
            await Subscriber.updateOne({ _id: sub._id }, { $set: { lastSentAt: new Date() } });
        } catch (err) {
            console.error('Digest email failed for', sub.email, err.message);
        }

        // Wait before next request
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    console.log(`✅ Sent ${title} to ${targetSubs.length} subscribers`);
};

const initScheduler = () => {
    console.log('⏰ Scheduler initialized');

    // Daily Digest at 9 PM (21:00)
    cron.schedule('0 21 * * *', async () => {
        console.log('⏰ Running Daily Digest Job...');
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        try {
            const tools = await Tool.find({
                status: 'approved',
                approvedAt: { $gte: startOfDay }
            }).sort({ approvedAt: -1 });

            if (tools.length >= 5) {
                await sendDigest(tools, 'Daily Digest');
            } else {
                console.log(`ℹ️ Daily digest skipped: ${tools.length} tools (min 5 required)`);
            }
        } catch (err) {
            console.error('❌ Daily digest job failed:', err.message);
        }
    });

    // Weekly Digest on Monday at 10 AM
    cron.schedule('0 10 * * 1', async () => {
        console.log('⏰ Running Weekly Digest Job...');
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
    });
};

module.exports = { initScheduler };
