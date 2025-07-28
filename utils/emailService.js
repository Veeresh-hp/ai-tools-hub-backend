// utils/emailService.js

require('dotenv').config();
const nodemailer = require('nodemailer');

// --- Centralized Transporter ---
// One transporter for the entire application.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD, // Using the new, clearer variable name
  },
});

// --- Generic Email Sending Function ---
const sendEmail = async (mailOptions) => {
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${mailOptions.to}`);
  } catch (error) {
    console.error(`❌ Failed to send email:`, error);
    throw new Error('Email sending failed');
  }
};

// --- Centralized Email Templates ---
// All your HTML email templates live here.
const emailTemplates = {
  /**
   * Generates options for the contact form submission email.
   * Logic from your original contact.js.
   */
  contactForm: (name, fromEmail, message) => ({
    from: `"${name} via AI Tools Hub" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER, // Sends the notification to you
    subject: `📫 New Message from ${name}`,
    replyTo: fromEmail, // Sets the "reply-to" field to the user's email
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #333;">New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${fromEmail}">${fromEmail}</a></p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p><strong>Message:</strong></p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${message}</div>
      </div>
    `,
  }),

  /**
   * Generates options for the password reset email.
   * Logic from your original email.js.
   */
  passwordReset: (toEmail, token) => {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    return {
      from: `"AI Tools Hub" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'AI Tools Hub Password Reset 😜',
      html: `
        <h2>Oops, forgot your password? No worries!</h2>
        <p>Click this magical link to reset your password: 
        <a href="${resetLink}" style="font-weight: bold; color: #1a73e8;">Reset Password 🚀</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Thanks,<br>The AI Tools Hub Team 😎</p>
      `,
    };
  },
};

module.exports = { sendEmail, emailTemplates };