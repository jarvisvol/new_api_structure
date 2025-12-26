const mongoose = require('mongoose');
const validator = require('validator');

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
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true, // This creates an index automatically
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return validator.isEmail(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true, // This creates an index automatically
    trim: true,
    validate: {
      validator: function(v) {
        return /^[6-9]\d{9}$/.test(v);
      },
      message: props => `${props.value} is not a valid Indian phone number!`
    }
  },

  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
  },

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

  isActive: {
    type: Boolean,
    default: true
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },

  accessToken: {
    type: String,
    select: false
  },

  profileImage: {
    type: String,
    default: ''
  },
  
  role: {
    type: String,
    enum: ['user', 'admin', 'agent'],
    default: 'user'
  },
  
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.otp;
      delete ret.otpExpires;
      delete ret.passcode;
      delete ret.accessToken;
      delete ret.__v;
      return ret;
    }
  }
});

// REMOVED duplicate indexes - Mongoose creates them automatically for unique: true
// Only keep non-unique indexes
userSchema.index({ 'address.city': 1 });
userSchema.index({ landType: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ otpVerified: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);
module.exports = User;