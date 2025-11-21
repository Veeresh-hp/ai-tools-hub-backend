/* File: utils/emailService.js 
  Description: Centralized email service using Resend HTTP API (no SMTP).
*/

const { Resend } = require('resend');
const { htmlEscape } = require('./htmlEscape');

const MIN_NEW_TOOL_EMAIL_COUNT = parseInt(process.env.MIN_NEW_TOOL_EMAIL_COUNT || '5', 10);

// ENV-based config
const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM; // e.g. "AI Tools Hub <noreply@aitoolshub.com>"
const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || emailFrom || '';

if (!resendApiKey) {
  console.warn('⚠️ RESEND_API_KEY is not set. Emails will fail until configured.');
}
if (!emailFrom) {
  console.warn('⚠️ EMAIL_FROM is not set. It must match a verified domain in Resend.');
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * Sends an email using Resend HTTP API.
 * @param {object} mailOptions - { from?, to, subject, html, text?, replyTo? }
 */
const sendEmail = async (mailOptions) => {
  try {
    if (!resend || !resendApiKey) {
      console.error('❌ RESEND_API_KEY missing or Resend not initialized.');
      throw new Error('Email service not configured.');
    }
    if (!emailFrom) {
      console.error('❌ EMAIL_FROM is not configured. Set it to a verified domain email.');
      throw new Error('Email FROM address not configured.');
    }

    const payload = {
      ...mailOptions,
      from: mailOptions.from || emailFrom, // enforce verified from address
    };

    console.log('📧 Sending via Resend:', {
      to: payload.to,
      subject: payload.subject,
      from: payload.from,
    });

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error('❌ Resend error:', error);
      throw new Error('Failed to send email.');
    }

    console.log('✅ Email sent successfully via Resend:', data?.id || data);
    return data;
  } catch (error) {
    console.error('❌ Error sending email:', error.message || error);
    // Re-throw so the caller (routes / services) can handle it
    throw new Error('Failed to send email.');
  }
};

/**
 * Email templates – only change is `from` now uses EMAIL_FROM.
 */
const emailTemplates = {
  /** Password reset */
  passwordReset: (recipientEmail, token) => {
    const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const logoURL = `${process.env.FRONTEND_URL}/logo.png`;

    return {
      from: emailFrom,
      to: recipientEmail,
      subject: 'Your Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${logoURL}" alt="AI Tools Hub Logo" style="max-width: 150px; height: auto;" />
          </div>
          <h2 style="text-align: center; color: #0056b3;">Password Reset Request</h2>
          <p>You are receiving this email because you (or someone else) have requested to reset the password for your account.</p>
          <p>Please click on the button below to choose a new password. This link is only valid for 10 minutes.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetURL}" target="_blank" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">Reset Password</a>
          </div>
          <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
          <hr style="border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 0.9em; color: #777;">AI Tools Hub</p>
        </div>
      `,
    };
  },

  /** Welcome email */
  welcome: (recipientEmail, username) => {
    const safeNameRaw =
      username && typeof username === 'string' && username.trim() !== ''
        ? username
        : 'there';
    const safeName = htmlEscape(safeNameRaw);
    const logoURL = `${process.env.FRONTEND_URL}/logo.png`;
    const loginURL = `${process.env.FRONTEND_URL}/login`;

    return {
      from: emailFrom,
      to: recipientEmail,
      subject: 'Welcome to AI Tools Hub! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${logoURL}" alt="AI Tools Hub Logo" style="max-width: 150px; height: auto;" />
          </div>
          <h2 style="text-align: center; color: #28a745;">Welcome, ${safeName}!</h2>
          <p>Thank you for joining AI Tools Hub! We're excited to have you on board.</p>
          <p>You can now explore a universe of powerful AI tools, save your favorites, and stay ahead of the curve. To get started, simply log in to your new account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginURL}" target="_blank" style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">Go to Login</a>
          </div>
          <p>If you have any questions, feel free to reply to this email.</p>
          <hr style="border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 0.9em; color: #777;">Happy exploring!</p>
          <p style="font-size: 0.9em; color: #777;">The AI Tools Hub Team</p>
        </div>
      `,
    };
  },

  /** Password reset success */
  resetSuccess: (recipientEmail, username) => {
    const logoURL = `${process.env.FRONTEND_URL}/logo.png`;
    const loginURL = `${process.env.FRONTEND_URL}/login`;

    return {
      from: emailFrom,
      to: recipientEmail,
      subject: 'Your Password Has Been Changed Successfully',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${logoURL}" alt="AI Tools Hub Logo" style="max-width: 150px; height: auto;" />
          </div>
          <h2 style="text-align: center; color: #0056b3;">Password Successfully Reset</h2>
          <p>Hello ${username},</p>
          <p>This is a confirmation that the password for your account has just been changed. If you did not make this change, please contact our support team immediately.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginURL}" target="_blank" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">Login to Your Account</a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 0.9em; color: #777;">The AI Tools Hub Team</p>
        </div>
      `,
    };
  },

  /** Contact form submission */
  contactForm: (name, email, message) => {
    const logoURL = `${process.env.FRONTEND_URL}/logo.png`;
    const safeName = htmlEscape(name || 'Unknown');
    const safeEmail = htmlEscape(email || '');
    const safeMsg = htmlEscape(message || '');

    return {
      from: emailFrom,
      to: adminEmail, // admin receives it
      replyTo: email,
      subject: `📩 New contact message from ${safeName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #eee;padding:24px;line-height:1.55;color:#222">
          <div style="text-align:center;margin-bottom:20px">
            <img src="${logoURL}" alt="AI Tools Hub" style="max-width:140px;height:auto" />
          </div>
          <h2 style="margin:0 0 12px;font-size:22px;color:#3b82f6">New Contact Form Submission</h2>
          <p style="margin:0 0 16px">You received a new message from <strong>${safeName}</strong> (${safeEmail}):</p>
          <blockquote style="margin:0 0 20px;padding:12px 16px;background:#f8fafc;border-left:4px solid #3b82f6;font-style:italic">${safeMsg}</blockquote>
          <p style="margin:0 0 12px;font-size:13px;color:#555">Reply directly to this email to start a conversation.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
          <p style="font-size:12px;color:#888">AI Tools Hub • Automated notification</p>
        </div>`,
    };
  },

  /** Single new tool announcement (with recent list) */
  newToolAnnouncement: ({ recipientEmail, tool, recentTools, unsubscribeUrl }) => {
    const logoURL = `${process.env.FRONTEND_URL}/logo.png`;
    const loginURL = `${process.env.FRONTEND_URL}/login`;
    const signupURL = `${process.env.FRONTEND_URL}/signup`;
    const safeToolName = htmlEscape(tool.name || 'New Tool');
    const safeToolDesc = htmlEscape(tool.description || '');
    const toolLink = htmlEscape(tool.url || process.env.FRONTEND_URL);

    const listHtml = recentTools
      .map((t) => {
        const itemName = htmlEscape(t.name || 'Tool');
        const itemDesc = htmlEscape(t.description || '');
        const itemUrl = htmlEscape(t.url || process.env.FRONTEND_URL);
        return `
      <li style="margin:0 0 12px;padding:12px;border:1px solid #eee;border-radius:8px;background:#ffffff">
        <div style="font-size:15px;font-weight:600;color:#111;margin:0 0 6px">${itemName}</div>
        <div style="font-size:13px;color:#555;margin:0 0 8px">${itemDesc.substring(0,140)}${itemDesc.length>140?'…':''}</div>
        <a href="${itemUrl}" target="_blank" style="display:inline-block;font-size:12px;text-decoration:none;background:#3b82f6;color:#fff;padding:6px 12px;border-radius:6px">Explore Tool →</a>
      </li>`;
      })
      .join('');

    return {
      from: emailFrom,
      to: recipientEmail,
      subject: `🚀 New AI Tool Added: ${safeToolName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;background:#0f172a;border:1px solid #1e293b;border-radius:12px;overflow:hidden;color:#e2e8f0">
          <div style="background:linear-gradient(90deg,#3b82f6,#6366f1,#ec4899);padding:24px;text-align:center">
            <img src="${logoURL}" alt="AI Tools Hub" style="width:72px;height:auto;border-radius:12px;border:3px solid rgba(255,255,255,0.4);margin-bottom:12px" />
            <h1 style="margin:0;font-size:26px;line-height:1.2;color:#fff">A Fresh Tool Just Landed ✨</h1>
            <p style="margin:8px 0 0;font-size:14px;color:#fefefe">We scout. You build. Stay ahead with hand-picked additions.</p>
          </div>
          <div style="padding:28px">
            <h2 style="margin:0 0 8px;font-size:20px;color:#fff">${safeToolName}</h2>
            <p style="margin:0 0 16px;font-size:14px;color:#cbd5e1">${safeToolDesc}</p>
            <a href="${toolLink}" target="_blank" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600">Try ${safeToolName} →</a>
            <hr style="border:none;border-top:1px solid #1e293b;margin:32px 0 24px" />
            <h3 style="margin:0 0 12px;font-size:16px;color:#fff">Recent Additions</h3>
            <ul style="list-style:none;padding:0;margin:0">${listHtml}</ul>
            <div style="margin:28px 0 0;text-align:center">
              <p style="margin:0 0 14px;font-size:13px;color:#94a3b8">Create a free account to bookmark favorites & get personalized recommendations.</p>
              <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
                <a href="${signupURL}" target="_blank" style="background:#10b981;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px">Sign Up Free</a>
                <a href="${loginURL}" target="_blank" style="background:#334155;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px">Log In</a>
              </div>
            </div>
          </div>
          <div style="background:#1e293b;padding:16px;text-align:center;font-size:11px;color:#94a3b8">
            You’re receiving this because you subscribed to AI Tools Hub updates.
            <br/>
            <a href="${unsubscribeUrl}" target="_blank" style="color:#93c5fd;text-decoration:underline">Unsubscribe</a>
          </div>
        </div>`,
    };
  },

  /** Digest email for multiple tools */
  newToolDigest: ({ recipientEmail, tools, unsubscribeUrl }) => {
    const logoURL = `${process.env.FRONTEND_URL}/logo.png`;
    const loginURL = `${process.env.FRONTEND_URL}/login`;
    const signupURL = `${process.env.FRONTEND_URL}/signup`;

    const items = tools
      .map((t) => {
        const itemName = htmlEscape(t.name || 'Tool');
        const itemDesc = htmlEscape(t.description || '');
        const itemUrl = htmlEscape(t.url || process.env.FRONTEND_URL);
        return `
      <li style="margin:0 0 12px;padding:14px;border:1px solid #1e293b;border-radius:10px;background:#0b1220">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div style="flex:1">
            <div style="font-size:15px;font-weight:700;color:#e5e7eb;margin:0 0 6px">${itemName}</div>
            <div style="font-size:13px;color:#94a3b8;margin:0 0 8px">${itemDesc.substring(0, 160)}${itemDesc.length>160?'…':''}</div>
          </div>
          <a href="${itemUrl}" target="_blank" style="white-space:nowrap;background:#3b82f6;color:#fff;text-decoration:none;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:600">Open →</a>
        </div>
      </li>`;
      })
      .join('');

    return {
      from: emailFrom,
      to: recipientEmail,
      subject: `✨ ${tools.length} new AI tools curated for you`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;background:#0f172a;border:1px solid #1e293b;border-radius:12px;overflow:hidden;color:#e2e8f0">
          <div style="background:linear-gradient(90deg,#06b6d4,#6366f1,#ec4899);padding:24px;text-align:center">
            <img src="${logoURL}" alt="AI Tools Hub" style="width:68px;height:auto;border-radius:12px;border:3px solid rgba(255,255,255,0.35);margin-bottom:12px" />
            <h1 style="margin:0;font-size:24px;color:#fff">Fresh AI tools you’ll love</h1>
            <p style="margin:8px 0 0;font-size:14px;color:#f1f5f9">Bookmark favorites, explore categories, and build faster.</p>
          </div>
          <div style="padding:24px">
            <ul style="list-style:none;padding:0;margin:0">${items}</ul>
            <div style="margin:24px 0 0;text-align:center">
              <p style="margin:0 0 12px;font-size:13px;color:#94a3b8">Create a free account to track your favorites and get personalized picks.</p>
              <a href="${signupURL}" target="_blank" style="display:inline-block;margin-right:10px;background:#10b981;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600">Sign Up Free</a>
              <a href="${loginURL}" target="_blank" style="display:inline-block;background:#334155;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600">Log In</a>
            </div>
          </div>
          <div style="background:#1e293b;padding:16px;text-align:center;font-size:11px;color:#94a3b8">
            You’re receiving this because you subscribed to AI Tools Hub updates.
            <br/>
            <a href="${unsubscribeUrl}" target="_blank" style="color:#93c5fd;text-decoration:underline">Unsubscribe</a>
          </div>
        </div>`,
    };
  },
};

/**
 * Send new tool emails to subscribers (unchanged, now using sendEmail → Resend)
 */
const sendNewToolEmail = async (tool, subscribers, recentTools = []) => {
  if (!tool || !subscribers || subscribers.length === 0) return;

  const totalCount = 1 + recentTools.length;
  if (totalCount < MIN_NEW_TOOL_EMAIL_COUNT) {
    console.log(`ℹ️ Skipping new tool email (only ${totalCount} < ${MIN_NEW_TOOL_EMAIL_COUNT})`);
    return;
  }

  const Subscriber = require('../models/Subscriber');
  const backendBase = process.env.BACKEND_URL || process.env.FRONTEND_URL || '';
  const uniqueByEmail = new Map();

  for (const s of subscribers) {
    if (s && s.email && !uniqueByEmail.has(s.email)) uniqueByEmail.set(s.email, s);
  }

  const jobs = [];

  for (const [email, sDoc] of uniqueByEmail.entries()) {
    if (sDoc.isUnsubscribed) continue;
    const unsubscribeUrl = `${backendBase}/api/newsletter/unsubscribe/${sDoc.unsubscribeToken}`;
    const mail = emailTemplates.newToolAnnouncement({
      recipientEmail: email,
      tool,
      recentTools: recentTools.slice(0, 5),
      unsubscribeUrl,
    });

    jobs.push(
      sendEmail(mail)
        .then(async () => {
          try {
            await Subscriber.updateOne(
              { _id: sDoc._id },
              { $set: { lastSentAt: new Date() } }
            );
          } catch (e) {
            console.error('Failed to update lastSentAt for', email, e.message);
          }
        })
        .catch((err) => {
          console.error(`Failed to send new tool email to ${email}:`, err.message);
        })
    );
  }

  await Promise.all(jobs);
};

module.exports = { sendEmail, emailTemplates, sendNewToolEmail };
