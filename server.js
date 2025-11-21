// ✅ Load .env FIRST so all other files see the env variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const cron = require('node-cron');

const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contact');
const newsletterRoutes = require('./routes/newsletter');
const toolRoutes = require('./routes/tools');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { checkEnv } = require('./utils/envCheck');
const path = require('path');
const { sendDailyNotification, sendWeeklyDigest } = require('./utils/toolNotificationService');


// Ensure uploads directory exists
const uploadsDir = require('path').join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
checkEnv();

// ✅ Fix for Express behind proxy (e.g. Render)
app.set('trust proxy', 1);

// ✅ ALLOWED ORIGINS FOR CORS (NO trailing slashes)
const allowedOrigins = [
  'https://ai-tools-rj5xk8ao0-veeresh-h-ps-projects.vercel.app',
  'https://ai-tools-7bbauireq-veeresh-h-ps-projects.vercel.app',
  'https://ai-tools-3rvvq91dm-veeresh-h-ps-projects.vercel.app',
  'https://ai-alltools.vercel.app',
  'https://myalltools.vercel.app',
  'https://ai-tools-seven-jet.vercel.app',
  'http://localhost:3000'
];

// ✅ CORS middleware — apply this FIRST (with wildcard for Vercel preview URLs)
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    // Allow all Vercel preview URLs from your project
    const isVercelPreview = origin.match(/^https:\/\/ai-tools-[a-z0-9]+-veeresh-h-ps-projects\.vercel\.app$/);
    if (allowedOrigins.includes(origin) || isVercelPreview) {
      callback(null, true);
    } else {
      callback(new Error(`❌ CORS blocked from origin: ${origin}`));
    }
  },
  credentials: true,
}));

// ✅ Handle OPTIONS (preflight) requests globally
app.options('*', cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`❌ CORS preflight blocked from origin: ${origin}`));
    }
  },
  credentials: true,
}));

// ✅ Built-in body parser must come after CORS
app.use(express.json());
app.use(helmet({ crossOriginResourcePolicy: false }));

// Generic rate limiter (fallback) – 300 requests / 15 min per IP
const genericLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(genericLimiter);

// ✅ Route handlers (after middleware)
app.use('/api/tools', toolRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);

// Serve uploaded files (snapshots) with friendly cache headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // Allow browsers/CDN to cache but revalidate periodically
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
  }
}));

// ✅ Default route
app.get('/', (req, res) => {
  res.send('✅ Backend working!');
});

// ✅ MongoDB connection with retry logic
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  w: 'majority',
})
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('📝 Retrying connection in 10 seconds...');
    setTimeout(() => {
      mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      }).catch(retryErr => {
        console.error('❌ Retry failed:', retryErr.message);
        console.error('⚠️ Check MongoDB Atlas and IP whitelist');
      });
    }, 10000);
  });

// Listen for connection events
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ Mongoose disconnected from MongoDB');
});

// ✅ Setup automated notification cron jobs
// Daily check at 9:00 PM (21:00) - sends if 5+ tools approved today
cron.schedule('0 21 * * *', async () => {
  console.log('⏰ Running daily notification check (9 PM)...');
  try {
    await sendDailyNotification();
  } catch (error) {
    console.error('❌ Daily notification cron failed:', error);
  }
}, {
  timezone: "Asia/Kolkata" // Adjust to your timezone
});

// Weekly digest every Monday at 10:00 AM
cron.schedule('0 10 * * 1', async () => {
  console.log('⏰ Running weekly digest (Monday 10 AM)...');
  try {
    await sendWeeklyDigest();
  } catch (error) {
    console.error('❌ Weekly digest cron failed:', error);
  }
}, {
  timezone: "Asia/Kolkata" // Adjust to your timezone
});

console.log('📅 Cron jobs initialized:');
console.log('  - Daily check: Every day at 9:00 PM (sends if 5+ tools)');
console.log('  - Weekly digest: Every Monday at 10:00 AM');




const { sendEmail } = require('./utils/emailService');

app.get('/api/test-email', async (req, res) => {
  try {
    await sendEmail({
      to: 'aitoolshub2@gmail.com', // your email to receive the test
      subject: '✅ Test email from AI Tools Hub (Resend)',
      html: '<p>If you see this, Resend is working correctly! 🎉</p>',
    });
    res.json({ success: true, message: 'Test email sent.' });
  } catch (err) {
    console.error('❌ Test email failed:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});



// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});