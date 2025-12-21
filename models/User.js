const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

// Address sub-schema
const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true,
    required: [true, 'City is required']
  },
  state: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true,
    default: 'India'
  },
  pincode: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d{6}$/.test(v);
      },
      message: props => `${props.value} is not a valid pincode!`
    }
  }
});

// Main User Schema
const userSchema = new mongoose.Schema({
  // Name field with validation
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  // Email field with validation
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return validator.isEmail(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  
  // Phone number field
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[6-9]\d{9}$/.test(v);
      },
      message: props => `${props.value} is not a valid Indian phone number!`
    }
  },
  
  // Address field
  address: {
    type: addressSchema,
    required: [true, 'Address is required']
  },
  
  // Land type field
  landType: {
    type: String,
    required: [true, 'Land type is required'],
    enum: {
      values: ['agricultural', 'residential', 'commercial', 'industrial', 'forest', 'barren', 'pasture', 'other'],
      message: '{VALUE} is not a valid land type'
    },
    default: 'agricultural'
  },

  // Password field
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
  },

  // OTP fields
  otp: {
    type: String,
    select: false
  },
  otpExpires: {
    type: Date,
    select: false
  },
  otpVerified: {
    type: Boolean,
    default: false
  },

  // Status fields
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },

  // Passcode field
  passcode: {
    type: String,
    select: false
  },

  // Token field for JWT storage
  accessToken: {
    type: String,
    select: false
  },

  // Additional fields you might need
  profileImage: {
    type: String,
    default: ''
  },
  
  role: {
    type: String,
    enum: ['user', 'admin', 'farmer', 'agent'],
    default: 'user'
  },
  
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive fields when converting to JSON
      delete ret.password;
      delete ret.otp;
      delete ret.otpExpires;
      delete ret.passcode;
      delete ret.accessToken;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// ========== MIDDLEWARE ==========

// Pre-save middleware for password hashing and OTP generation
userSchema.pre('save', async function(next) {
  try {
    // 1. Hash password if modified
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    
    // 2. Generate OTP for new users
    if (this.isNew && !this.otp) {
      this.otp = Math.floor(100000 + Math.random() * 900000).toString();
      this.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Post-save middleware (optional - for logging)
userSchema.post('save', function(doc, next) {
  console.log(`✅ User ${doc.email} saved successfully`);
  next();
});

// ========== INDEXES ==========
userSchema.index({ 'address.city': 1 });
userSchema.index({ landType: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ otpVerified: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ role: 1 });
userSchema.index({ email: 'text', name: 'text' }); // Text search index

// ========== INSTANCE METHODS ==========

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if OTP is valid
userSchema.methods.isValidOTP = function(inputOtp) {
  return this.otp === inputOtp && this.otpExpires > Date.now();
};

// Generate new OTP
userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return otp;
};

// Get full address
userSchema.methods.getFullAddress = function() {
  const addr = this.address;
  const parts = [];
  
  if (addr.street) parts.push(addr.street);
  if (addr.city) parts.push(addr.city);
  if (addr.state) parts.push(addr.state);
  if (addr.country) parts.push(addr.country);
  if (addr.pincode) parts.push(`PIN: ${addr.pincode}`);
  
  return parts.join(', ');
};

// Update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// Reset password (if needed)
userSchema.methods.resetPassword = async function(newPassword) {
  this.password = newPassword;
  this.otp = undefined;
  this.otpExpires = undefined;
  return await this.save();
};

// ========== VIRTUAL PROPERTIES ==========

// Formatted phone number
userSchema.virtual('formattedPhone').get(function() {
  const phone = this.phoneNumber;
  if (!phone) return '';
  return `+91 ${phone.substring(0, 5)} ${phone.substring(5)}`;
});

// User status
userSchema.virtual('status').get(function() {
  if (!this.isActive) return 'Inactive';
  if (!this.otpVerified) return 'Pending Verification';
  return 'Active';
});

// Short address (city, state)
userSchema.virtual('shortAddress').get(function() {
  const addr = this.address;
  return `${addr.city}, ${addr.state}`;
});

// User age (if you had dob field)
userSchema.virtual('age').get(function() {
  if (!this.dob) return null;
  const today = new Date();
  const birthDate = new Date(this.dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// ========== STATIC METHODS ==========

// Find by land type
userSchema.statics.findByLandType = function(landType) {
  return this.find({ landType, isActive: true });
};

// Find by city
userSchema.statics.findByCity = function(city) {
  return this.find({ 'address.city': new RegExp(city, 'i'), isActive: true });
};

// Find verified users
userSchema.statics.findVerified = function() {
  return this.find({ otpVerified: true, isActive: true });
};

// Search users
userSchema.statics.search = function(query) {
  return this.find({
    $or: [
      { name: new RegExp(query, 'i') },
      { email: new RegExp(query, 'i') },
      { phoneNumber: new RegExp(query, 'i') },
      { 'address.city': new RegExp(query, 'i') }
    ],
    isActive: true
  });
};

// Get user statistics
userSchema.statics.getStats = async function() {
  const total = await this.countDocuments();
  const verified = await this.countDocuments({ otpVerified: true });
  const active = await this.countDocuments({ isActive: true });
  const byLandType = await this.aggregate([
    { $group: { _id: '$landType', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  return {
    total,
    verified,
    active,
    byLandType,
    pendingVerification: total - verified
  };
};

// Find by token
userSchema.statics.findByToken = function(token) {
  return this.findOne({ accessToken: token, isActive: true });
};

// ========== QUERY HELPERS ==========

// Query helper for active users
userSchema.query.active = function() {
  return this.where({ isActive: true });
};

// Query helper for verified users
userSchema.query.verified = function() {
  return this.where({ otpVerified: true });
};

// Query helper for land type
userSchema.query.byLandType = function(landType) {
  return this.where({ landType });
};

const User = mongoose.model('User', userSchema);

module.exports = User;