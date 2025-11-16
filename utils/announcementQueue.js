// utils/announcementQueue.js
// Batching queue for new tool approvals to reduce email send frequency.
// Collect tools over an interval and send a digest email.

const Tool = require('../models/Tool');
const Subscriber = require('../models/Subscriber');
const User = require('../models/User');
const { sendEmail, emailTemplates } = require('./emailService');
const MIN_NEW_TOOL_EMAIL_COUNT = parseInt(process.env.MIN_NEW_TOOL_EMAIL_COUNT || '5', 10);

const BATCH_INTERVAL_MS = parseInt(process.env.BATCH_INTERVAL_MS || '300000', 10); // default 5 minutes
const BATCH_SEND_ENABLED = (process.env.BATCH_SEND_ENABLED || 'true').toLowerCase() === 'true';

let queue = []; // { name, description, url }
let timer = null;

function startTimerIfNeeded() {
  if (timer || !BATCH_SEND_ENABLED) return;
  timer = setTimeout(async () => {
    const toSend = [...queue];
    queue = [];
    timer = null;
    if (toSend.length === 0) return;
    if (toSend.length < MIN_NEW_TOOL_EMAIL_COUNT) {
      console.log(`ℹ️ Digest deferred; only ${toSend.length} < ${MIN_NEW_TOOL_EMAIL_COUNT}. Waiting for more tools.`);
      // Re-append and restart timer
      queue.push(...toSend);
      startTimerIfNeeded();
      return;
    }
    try {
      await sendDigest(toSend);
    } catch (err) {
      console.error('Digest send failed:', err.message);
    }
  }, BATCH_INTERVAL_MS);
}

async function sendDigest(tools) {
  // Fetch subscribers (exclude unsubscribed and registered users)
  const [subs, users] = await Promise.all([
    Subscriber.find({ isUnsubscribed: false }, 'email unsubscribeToken'),
    User.find({}, 'email')
  ]);
  const userEmailSet = new Set(users.map(u => u.email));
  const targetSubs = subs.filter(s => !userEmailSet.has(s.email));

  const backendBase = process.env.BACKEND_URL || process.env.FRONTEND_URL || '';
  const jobs = targetSubs.map(sub => {
    const unsubscribeUrl = `${backendBase}/api/newsletter/unsubscribe/${sub.unsubscribeToken}`;
    const mail = emailTemplates.newToolDigest({
      recipientEmail: sub.email,
      tools: tools.slice(0, 10),
      unsubscribeUrl
    });
    return sendEmail(mail)
      .then(() => Subscriber.updateOne({ _id: sub._id }, { $set: { lastSentAt: new Date() } }))
      .catch(err => console.error('Digest email failed for', sub.email, err.message));
  });
  await Promise.all(jobs);
  console.log(`✅ Sent digest with ${tools.length} tools to ${targetSubs.length} subscribers`);
}

function registerTool(tool) {
  if (!BATCH_SEND_ENABLED) return; // no-op if disabled
  queue.push({ name: tool.name, description: tool.description, url: tool.url });
  // Cap queue size: if > 10 send immediately
  if (queue.length >= 10) {
    clearTimeout(timer);
    timer = null;
    const toSendNow = [...queue];
    queue = [];
    if (toSendNow.length < MIN_NEW_TOOL_EMAIL_COUNT) {
      console.log(`ℹ️ Immediate digest blocked; only ${toSendNow.length} < ${MIN_NEW_TOOL_EMAIL_COUNT}. Re-queueing.`);
      queue.push(...toSendNow);
      startTimerIfNeeded();
    } else {
      sendDigest(toSendNow).catch(err => console.error('Immediate digest failed:', err.message));
    }
    return;
  }
  startTimerIfNeeded();
}

module.exports = { registerTool, _queue: () => queue };
