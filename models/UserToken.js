const mongoose = require('mongoose');

const userTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  accessToken: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '7d' // Auto delete after 7 days
  }
}, {
  timestamps: true
});

const UserToken = mongoose.model('UserToken', userTokenSchema);
module.exports = UserToken;