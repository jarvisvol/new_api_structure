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
    minlength: 6,
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// REMOVED duplicate index definitions - Mongoose automatically creates indexes for unique: true
// userSchema.index({ email: 1 }); // REMOVE THIS LINE - duplicate
// userSchema.index({ phoneNumber: 1 }); // REMOVE THIS LINE - duplicate

// Keep these non-unique indexes
userSchema.index({ 'address.city': 1 });
userSchema.index({ landType: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ otpVerified: 1 });
userSchema.index({ isActive: 1 });

// Pre-save middleware for password hashing
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();
  
  try {
    // If password is already encrypted with CryptoJS, skip bcrypt
    // Or use bcrypt if you're starting fresh
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware for OTP generation on new user
userSchema.pre('save', function(next) {
  if (this.isNew && !this.otp) {
    this.otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  }
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isValidOTP = function(inputOtp) {
  return this.otp === inputOtp && this.otpExpires > Date.now();
};

userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return otp;
};

userSchema.methods.getFullAddress = function() {
  const addr = this.address;
  return `${addr.street ? addr.street + ', ' : ''}${addr.city}, ${addr.state ? addr.state + ', ' : ''}${addr.pincode}`.trim();
};

// Virtual properties
userSchema.virtual('formattedPhone').get(function() {
  const phone = this.phoneNumber;
  return phone ? `+91 ${phone.substring(0, 5)} ${phone.substring(5)}` : '';
});

userSchema.virtual('status').get(function() {
  if (!this.isActive) return 'Inactive';
  return this.isVerified ? 'Verified' : 'Pending Verification';
});

// Static methods
userSchema.statics.findByLandType = function(landType) {
  return this.find({ landType });
};

userSchema.statics.findByCity = function(city) {
  return this.find({ 'address.city': city });
};

const User = mongoose.model('User', userSchema);
module.exports = User;