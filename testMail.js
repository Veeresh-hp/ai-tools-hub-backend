const nodemailer = require('nodemailer');

async function testMail() {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'veereshhp2004@gmail.com',
      pass: 'rcuonfmqjpypaasv',
    },
  });

  try {
    const info = await transporter.sendMail({
      from: 'veereshhp04@gmail.com',
      to: 'your.email@gmail.com',
      subject: 'Test Email ✔',
      text: 'This is a test email from nodemailer!',
    });

    console.log('✅ Email sent:', info.response);
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
  }
}

testMail();
