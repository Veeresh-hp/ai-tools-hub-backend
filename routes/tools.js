const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Tool = require('../models/Tool');
const Subscriber = require('../models/Subscriber');
const { sendNewToolEmail } = require('../utils/emailService');
const User = require('../models/User');
const { registerTool } = require('../utils/announcementQueue');
const { auth, requireAdmin } = require('../middleware/auth');

// Cloudinary setup (if configured, else fallback to local)
let upload;
const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

if (hasCloudinary) {
  try {
    const cloudinary = require('cloudinary').v2;
    const { CloudinaryStorage } = require('multer-storage-cloudinary');
    
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    const cloudinaryStorage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'ai-tools-snapshots',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ width: 800, height: 600, crop: 'limit' }]
      }
    });

    upload = multer({ storage: cloudinaryStorage, limits: { fileSize: 5 * 1024 * 1024 } });
    console.log('✅ Using Cloudinary for image storage');
  } catch (err) {
    console.error('❌ Cloudinary setup failed:', err.message);
    console.log('⚠️ Falling back to local storage');
    hasCloudinary = false; // Force fallback
  }
}

if (!hasCloudinary) {
  // Fallback to local storage for development
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  
  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('📁 Created uploads directory');
    } catch (err) {
      console.error('❌ Failed to create uploads directory:', err.message);
    }
  }

  const localStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      const unique = `${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname)}`;
      cb(null, unique);
    }
  });
  upload = multer({ storage: localStorage, limits: { fileSize: 5 * 1024 * 1024 } });
  console.log('⚠️ Using local storage for images (not suitable for production)');
}

// POST /api/tools/upload - upload snapshot image (no auth required - open to everyone)
router.post('/upload', (req, res) => {
  const uploadMiddleware = upload.single('snapshot');
  
  uploadMiddleware(req, res, (err) => {
    if (err) {
      console.error('Multer upload error:', err.message);
      return res.status(500).json({ 
        error: 'File upload failed', 
        details: err.message,
        hint: hasCloudinary ? 'Check Cloudinary credentials' : 'Check uploads folder permissions'
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Return Cloudinary URL if using cloud storage, else local path
      const fileUrl = req.file.path || `/uploads/${req.file.filename}`;
      console.log('✅ File uploaded successfully:', fileUrl);
      res.json({ url: fileUrl });
    } catch (err) {
      console.error('Upload processing error:', err.message);
      res.status(500).json({ error: 'Failed to process uploaded file' });
    }
  });
});

// POST /api/tools/submit - submit new tool (open to everyone, auth optional)
router.post('/submit', async (req, res) => {
  try {
    const { name, description, url, category, snapshotUrl, submitterEmail } = req.body;
    if (!name || !description) return res.status(400).json({ error: 'Name and description are required' });
    if (!category) return res.status(400).json({ error: 'Category is required' });

    // Check if user is authenticated from header (optional)
    let submittedBy = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const User = require('../models/User');
        const user = await User.findById(payload.userId);
        if (user) submittedBy = user._id;
      } catch (err) {
        // Token invalid or expired - ignore and continue as anonymous
        console.log('Token verification failed, submitting as anonymous');
      }
    }

    const tool = await Tool.create({
      name,
      description,
      url,
      category,
      snapshotUrl,
      submittedBy, // can be null for anonymous submissions
      status: 'pending'
    });

    res.status(201).json({ message: 'Tool submitted and pending admin approval', tool });
  } catch (err) {
    console.error('Submit tool error:', err.message);
    res.status(500).json({ error: 'Failed to submit tool' });
  }
});

// GET /api/tools/pending - list pending tools (admin only)
router.get('/pending', auth, requireAdmin, async (req, res) => {
  try {
    const pending = await Tool.find({ status: 'pending' }).populate('submittedBy', 'username email');
    res.json({ tools: pending });
  } catch (err) {
    console.error('Get pending tools error:', err.message);
    res.status(500).json({ error: 'Failed to fetch pending tools' });
  }
});

// GET /api/tools/approved - get all approved tools (public - no auth required)
// MUST be before /:id routes to avoid conflict
router.get('/approved', async (req, res) => {
  try {
    const approved = await Tool.find({ status: 'approved' })
      .populate('submittedBy', 'username')
      .sort({ createdAt: -1 }); // newest first
    res.json({ tools: approved });
  } catch (err) {
    console.error('Get approved tools error:', err.message);
    res.status(500).json({ error: 'Failed to fetch approved tools' });
  }
});

// PUT /api/tools/:id/edit - edit a pending tool before approval (admin only)
router.put('/:id/edit', auth, requireAdmin, upload.single('snapshot'), async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    
    // Update fields if provided
    const { name, description, url, category, pricing, badge, isNew } = req.body;
    if (name) tool.name = name;
    if (description) tool.description = description;
    if (url) tool.url = url;
    if (category) tool.category = category;
    if (pricing) tool.pricing = pricing;
    if (badge !== undefined) tool.badge = badge || null;
    if (isNew !== undefined) tool.isNew = isNew === 'true' || isNew === true;
    
    // Update snapshot if a new file is uploaded
    if (req.file) {
      // Store as relative path so frontend can prefix with API base
      tool.snapshotUrl = `/uploads/${req.file.filename}`;
    }
    
    await tool.save();
    res.json({ message: 'Tool updated successfully', tool });
  } catch (err) {
    console.error('Edit tool error:', err.message);
    res.status(500).json({ error: 'Failed to update tool' });
  }
});

// POST /api/tools/:id/approve - approve a tool (admin only)
router.post('/:id/approve', auth, requireAdmin, async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    tool.status = 'approved';
    await tool.save();

    // Either enqueue for digest or send immediately
    try {
      if ((process.env.BATCH_SEND_ENABLED || 'true').toLowerCase() === 'true') {
        registerTool({ name: tool.name, description: tool.description, url: tool.url });
      } else {
        const [subscribers, users] = await Promise.all([
          Subscriber.find({}, 'email unsubscribeToken isUnsubscribed lastSentAt'),
          User.find({}, 'email')
        ]);
        const userEmailSet = new Set(users.map(u => u.email));
        const targetSubscribers = subscribers.filter(s => !userEmailSet.has(s.email));
        const recentTools = await Tool.find({ status: 'approved' })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('name description url');
        await sendNewToolEmail(
          { name: tool.name, description: tool.description, url: tool.url },
          targetSubscribers,
          recentTools
        );
      }
    } catch (emailErr) {
      console.error('Failed to send new tool announcement:', emailErr.message);
    }

    res.json({ message: 'Tool approved' });
  } catch (err) {
    console.error('Approve tool error:', err.message);
    res.status(500).json({ error: 'Failed to approve tool' });
  }
});

// POST /api/tools/:id/reject - reject a tool (admin only)
router.post('/:id/reject', auth, requireAdmin, async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    tool.status = 'rejected';
    await tool.save();
    res.json({ message: 'Tool rejected' });
  } catch (err) {
    console.error('Reject tool error:', err.message);
    res.status(500).json({ error: 'Failed to reject tool' });
  }
});

// Legacy route for notifying subscribers when a tool is added manually by admin
router.post('/notify-add', auth, requireAdmin, async (req, res) => {
  const { name, description, link } = req.body;
  const tool = { name, description, link };

  try {
    if ((process.env.BATCH_SEND_ENABLED || 'true').toLowerCase() === 'true') {
      registerTool(tool);
      return res.status(200).json({ message: '✅ Tool queued for digest announcement.' });
    }
    const [subscribers, users] = await Promise.all([
      Subscriber.find({}, 'email unsubscribeToken isUnsubscribed lastSentAt'),
      User.find({}, 'email')
    ]);
    const userEmailSet = new Set(users.map(u => u.email));
    const targetSubscribers = subscribers.filter(s => !userEmailSet.has(s.email));
    const recentTools = await Tool.find({ status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name description url');

    await sendNewToolEmail(tool, targetSubscribers, recentTools);
    res.status(200).json({ message: '✅ Announcement emails sent to non‑registered subscribers!' });
  } catch (error) {
    console.error('❌ Failed to notify subscribers:', error);
    res.status(500).json({ message: 'Failed to notify subscribers.' });
  }
});

module.exports = router;