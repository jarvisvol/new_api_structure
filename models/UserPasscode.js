const mongoose = require('mongoose');

const userPasscodeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  passcode: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const UserPasscode = mongoose.model('UserPasscode', userPasscodeSchema);
module.exports = UserPasscode;