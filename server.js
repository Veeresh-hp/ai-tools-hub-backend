const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');

dotenv.config();

const app = express();

// ✅ ALLOWED ORIGINS FOR CORS
const allowedOrigins = [
  'https://your-app.vercel.app',
  'https://myalltools.vercel.app', // ✅ NEW: Your current frontend domain
  'http://localhost:3000'          // ✅ Local development
];

// ✅ CORS CONFIGURATION
app.use(cors({
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

// ✅ Auth routes
app.use('/api/auth', authRoutes);

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
