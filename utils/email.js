require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendResetEmail = async (email, token) => {
  const resetLink = `https://myalltools.vercel.app/reset-password?token=${token}`; // ✅ fixed domain

  const mailOptions = {
    from: `"AI Tools Hub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'AI Tools Hub Password Reset 😜',
    html: `
      <h2>Oops, forgot your password? No worries!</h2>
      <p>Click this magical link to reset your password: 
      <a href="${resetLink}">Reset Password 🚀</a></p>
      <p>This link expires in 1 hour, so hurry up!</p>
      <p>If you didn't request this, just ignore this email.</p>
      <p>Love, The AI Tools Hub Team 😎</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent to', email);
  } catch (err) {
    console.error('❌ Email sending failed:', err);
    throw err;
  }
};

module.exports = { sendResetEmail };
