const nodemailer = require('nodemailer');

/**
 * Creates a reusable transporter object using the default SMTP transport
 */
const createTransporter = () => {
  // IMPORTANT: Use a Gmail "App Password" if you're using a Gmail account.
  // Google has deprecated the use of less secure apps.
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
   * @param {string} recipientEmail - The email address of the recipient.
   * @param {string} token - The raw password reset token.
   * @returns {object} - The mailOptions object for Nodemailer.
   */
  passwordReset: (recipientEmail, token) => {
    // Construct the reset URL using your frontend's URL from .env
    const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    // ✅ FIX: Define the logoURL variable here
    const logoURL = `${process.env.FRONTEND_URL}/logo.png`; // Adjust the path to your logo as needed

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
};

module.exports = { sendEmail, emailTemplates };
