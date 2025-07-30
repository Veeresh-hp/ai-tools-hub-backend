const nodemailer = require('nodemailer');

// Email template
const newToolTemplate = ({ name, description, link }) => `
  <div style="font-family: sans-serif;">
    <h2>🆕 New AI Tool: ${name}</h2>
    <p>${description}</p>
    <a href="${link}" target="_blank" style="display: inline-block; margin-top: 10px; padding: 10px 15px; background-color: #007BFF; color: white; text-decoration: none; border-radius: 5px;">Try Now</a>
  </div>
`;

// Reusable email sending function
const sendNewToolEmail = async (tool, subscribers) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  for (const subscriber of subscribers) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: subscriber.email,
      subject: `New AI Tool: ${tool.name}`,
      html: newToolTemplate(tool)
    };

    await transporter.sendMail(mailOptions);
  }
};

module.exports = {
  newToolTemplate,
  sendNewToolEmail
};
