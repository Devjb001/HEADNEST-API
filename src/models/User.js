
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  anonymousName: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: false 
  },
  googleId: { 
    type: String,
    default: null,
    sparse: true 
  },
  avatar: {
    type: String,
    default: null
  },
  name: { 
    type: String 
  },
  role: { 
    type: String, 
    enum: ['patient', 'therapist'], 
    default: 'patient' 
  },
  bio: { 
    type: String, 
    default: '' 
  },
  specialties: { 
    type: [String], 
    default: [] 
  },
  ratePerSession: { 
    type: Number 
  },
  currency: { 
    type: String, 
    default: 'NGN' 
  },
  availableHours: { 
    type: [String], 
    default: [] 
  },
  ratings: { 
    type: Number, 
    default: 0 
  },
  reviews: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      rating: Number,
      comment: String,
    },
  ],
  settings: {
    notifications: { type: Boolean, default: true },
    language: { type: String, default: 'en' },
    theme: { type: String, default: 'light' }
  },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  verificationTokenExpires: Date
}, { timestamps: true });

// Hash password before saving 
userSchema.pre('save', async function (next) {

  if (this.isModified('password') && this.password && !this.password.startsWith('$2')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
