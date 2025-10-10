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
    type: String
    },
 googleId: { 
    type: String,
    default: null
 },
  avatar: {
    type: String,
    default: null
    },

    name: { type: String },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: false },
    role: { type: String, enum: ['patient', 'therapist'], default: 'patient' },
    bio: { type: String, default: '' },
    specialties: { type: [String], default: [] },
    ratePerSession: { type: Number },
    currency: { type: String, default: 'NGN' },
    availableHours: { type: [String], default: [] },
    ratings: { type: Number, default: 0 },
    googleId: String,
    reviews: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rating: Number,
        comment: String,
      },
    ],

    // Settings field
  settings: {
    notifications: { type: Boolean, default: true },
    language: { type: String, default: 'en' },
    theme: { type: String, default: 'light' }
  },
    // Email verification fields
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  verificationTokenExpires: Date
  
}, { timestamps: true });

// Hashing the  password before saving to db
userSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});



// Comparing the password entered password with stored hash
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

