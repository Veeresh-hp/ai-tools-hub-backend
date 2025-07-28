const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Import existing routes
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contact');
const subscribeRoutes = require('./routes/subscribe'); // ✨ New line

dotenv.config();

const app = express();

// ✅ ALLOWED ORIGINS FOR CORS (NO trailing slashes)
const allowedOrigins = [
  'https://ai-tools-rj5xk8ao0-veeresh-h-ps-projects.vercel.app',
  'https://ai-alltools.vercel.app',
  'https://myalltools.vercel.app',
  'https://ai-tools-seven-jet.vercel.app',
  'http://localhost:3000'
];


// ✅ CORS CONFIGURATION FOR ALL REQUESTS
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked request from origin: ${origin}`));
    }
  },
  credentials: true,
}));

// ✅ HANDLE PRE-FLIGHT OPTIONS REQUESTS (Optional but good practice)
app.options('*', cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`❌ CORS blocked from origin: ${origin}`));
    }
  },
  credentials: true,
}));

app.use(express.json());

// ✅ Default route
app.get('/', (req, res) => {
  res.send('✅ Backend working!');
});

// ✅ API routes
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/subscribe', subscribeRoutes); // ✨ New line

// ✅ MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// ✅ Server startup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});