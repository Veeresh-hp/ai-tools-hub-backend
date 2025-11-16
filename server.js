const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contact');
const newsletterRoutes = require('./routes/newsletter');
const toolRoutes = require('./routes/tools');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { checkEnv } = require('./utils/envCheck');
const path = require('path');

dotenv.config();

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
  'https://ai-alltools.vercel.app',
  'https://myalltools.vercel.app',
  'https://ai-tools-seven-jet.vercel.app',
  'http://localhost:3000'
];

// ✅ CORS middleware — apply this FIRST
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
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

// Serve uploaded files (snapshots)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});