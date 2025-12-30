// database/config.js - Minimal version
const mongoose = require('mongoose');
require('dotenv').config();

// Simple connection
mongoose.connect(process.env.MONGODB_URI)
  .then()
  .catch(err => {
    process.exit(1);
  });

module.exports = mongoose;