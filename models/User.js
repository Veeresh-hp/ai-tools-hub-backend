const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true, // Removes whitespace from both ends
    lowercase: true,
    match: [/\S+@\S+\.\S+/, 'is invalid'],
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true, // Removes whitespace from both ends
    lowercase: true,
    minlength: 3,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
  },
  // Fields for password reset
  passwordResetToken: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
}, { 
  // Mongoose's built-in way to add createdAt and updatedAt fields
  timestamps: true 
});

// --- MIDDLEWARE ---

// Hash password before saving the user
userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with a salt round of 12
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});


// --- INSTANCE METHODS ---

/**
 * Compares a candidate password with the user's hashed password.
 * @param {string} candidatePassword The password to compare.
 * @returns {Promise<boolean>} True if the passwords match, false otherwise.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};


const User = mongoose.model('User', userSchema);

module.exports = User;
