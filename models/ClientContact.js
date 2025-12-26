// models/ClientContact.js
const mongoose = require('mongoose');
const validator = require('validator');

const clientContactSchema = new mongoose.Schema({
  // Required fields
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
    trim: true,
    lowercase: true,
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
    trim: true,
    validate: {
      validator: function(v) {
        return /^[6-9]\d{9}$/.test(v);
      },
      message: props => `${props.value} is not a valid Indian phone number!`
    }
  },
  
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    minlength: [10, 'Message must be at least 10 characters long'],
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  
  // Optional fields for admin use
  status: {
    type: String,
    enum: ['new', 'contacted', 'resolved', 'spam'],
    default: 'new'
  },
  
  isRead: {
    type: Boolean,
    default: false
  },
  
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
clientContactSchema.index({ createdAt: -1 });
clientContactSchema.index({ status: 1 });
clientContactSchema.index({ email: 1 });
clientContactSchema.index({ phoneNumber: 1 });
clientContactSchema.index({ isRead: 1 });

const ClientContact = mongoose.model('ClientContact', clientContactSchema);
module.exports = ClientContact;