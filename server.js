// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const ratelimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contact');
const newsletterRoutes = require('./routes/newsletter');
const toolRoutes = require('./routes/tools');

dotenv.config();
const app = express();

// --- Middleware ---

// Basic security with Helmet
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  'https://ai-tools-rj5xk8ao0-veeresh-h-ps-projects.vercel.app',
  'https://ai-alltools.vercel.app',
  'https://myalltools.vercel.app',
  'https://ai-tools-seven-jet.vercel.app',
  'http://localhost:3000',
  process.env.FRONTEND_URL // Add your primary frontend URL from .env
].filter(Boolean); // Filter out undefined values

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked request from origin: ${origin}`));
    }
  },
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '10mb' }));

// Rate limiting for API routes
const apiLimiter = ratelimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again after 15 minutes.'
});
app.use('/api/', apiLimiter);

// --- MongoDB Connection & Models ---

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// --- API Routes ---

app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/tools', toolRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI Tools Hub API is healthy and running!',
    timestamp: new Date().toISOString()
  });
});

// Default route for base URL
app.get('/', (req, res) => {
  res.send('✅ AI Tools Hub Backend is working!');
});

// --- Error & 404 Handling ---

// 404 handler for routes not found
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.originalUrl}`
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error.stack);
  res.status(500).json({
    success: false,
    error: 'An internal server error occurred.'
  });
});

// --- Server Startup ---

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email service configured for: ${process.env.EMAIL_USER}`);
});