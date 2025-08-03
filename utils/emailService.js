const nodemailer = require('nodemailer');

/**
 * Creates a reusable transporter object using the default SMTP transport
 */
const createTransporter = () => {
  // IMPORTANT: Use a Gmail "App Password" if you're using a Gmail account.
  return nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER, // Your email address from .env
      pass: process.env.EMAIL_PASS, // Your email App Password from .env
    },
  });
};

/**
 * Sends an email using the pre-configured transporter.
 * @param {object} mailOptions - The mail options object (from, to, subject, html).
 */
const sendEmail = async (mailOptions) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.response);
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    // Re-throw the error to be caught by the calling function
    throw new Error('Failed to send email.');
  }
};

/**
 * Contains templates for different types of emails.
 */
const emailTemplates = {
  /**
   * Generates the mail options for a password reset email.
   */
  passwordReset: (recipientEmail, token) => {
    const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const logoURL = `${process.env.FRONTEND_URL}/log.png`; 

    return {
      from: `"AI Tools Hub" <${process.env.EMAIL_USER}>`,
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

  /**
   * Generates the mail options for a welcome email.
   */
  welcome: (recipientEmail, username) => {
    const logoURL = `${process.env.FRONTEND_URL}/log.png`;
    const loginURL = `${process.env.FRONTEND_URL}/login`;

    return {
      from: `"AI Tools Hub" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: 'Welcome to AI Tools Hub! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${logoURL}" alt="AI Tools Hub Logo" style="max-width: 150px; height: auto;" />
          </div>
          <h2 style="text-align: center; color: #28a745;">Welcome, ${username}!</h2>
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
  
  /**
   * ✅ NEW: Generates the mail options for a password reset confirmation.
   */
  resetSuccess: (recipientEmail, username) => {
    const logoURL = `${process.env.FRONTEND_URL}/log.png`;
    const loginURL = `${process.env.FRONTEND_URL}/login`;

    return {
      from: `"AI Tools Hub" <${process.env.EMAIL_USER}>`,
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
};

module.exports = { sendEmail, emailTemplates };
