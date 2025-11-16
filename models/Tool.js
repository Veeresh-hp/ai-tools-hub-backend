const mongoose = require('mongoose');

const toolSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  url: { type: String, trim: true },
  category: { type: String, required: true, trim: true }, // Category for the tool
  snapshotUrl: { type: String, trim: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Optional - can be null for anonymous submissions
}, { timestamps: true });

module.exports = mongoose.model('Tool', toolSchema);
