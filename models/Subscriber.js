const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  subscribedAt: { 
    type: Date, 
    default: Date.now 
  },
});

// Add index for better performance
subscriberSchema.index({ email: 1 });

module.exports = mongoose.model('Subscriber', subscriberSchema);