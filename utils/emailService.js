// utils/emailService.js
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

const sendEmail = async (mailOptions) => {
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${mailOptions.to}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${mailOptions.to}:`, error.message);
    throw new Error('Email sending failed'); // This ensures errors are caught by route handlers
  }
};

const emailTemplates = {
  welcome: (toEmail) => ({
    from: `"AI Tools Hub" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '🚀 Welcome to the AI Tools Hub Newsletter!',
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h1 style="color: #4A90E2;">Welcome Aboard!</h1>
        <p>Thank you for subscribing to the AI Tools Hub newsletter.</p>
        <p>You'll now receive updates on the latest and greatest AI tools, right in your inbox.</p>
        <p>Stay curious!</p>
      </div>`
  }),
  contactForm: (name, fromEmail, message) => ({
    from: `"${name} via AI Tools Hub" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `📫 New Message from ${name}`,
    replyTo: fromEmail,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${fromEmail}">${fromEmail}</a></p>
        <hr/>
        <p><strong>Message:</strong></p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">${message}</div>
      </div>`
  }),
  passwordReset: (toEmail, token) => ({
    from: `"AI Tools Hub" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'AI Tools Hub Password Reset 😜',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>Click this link to reset your password: 
        <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}">Reset Password 🚀</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>`
  }),
  newTool: (toolData) => ({
    from: `"AI Tools Hub" <${process.env.EMAIL_USER}>`,
    subject: `🆕 New AI Tool Added: ${toolData.name}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #333;">🚀 New Tool Alert!</h2>
        <p>A new AI tool has just been added to our hub:</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
            <h3 style="margin-top: 0;">${toolData.name} - <span style="font-weight:normal; color: #555;">${toolData.category}</span></h3>
            <p>${toolData.description}</p>
            <a href="${toolData.url}" style="display: inline-block; padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Check it out</a>
        </div>
        <p style="font-size: 12px; color: #999; margin-top: 20px;">You are receiving this because you subscribed to AI Tools Hub.</p>
      </div>`
  }),
};

module.exports = { sendEmail, emailTemplates };