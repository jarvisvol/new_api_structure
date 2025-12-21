
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection URI from environment variables
const mongoURI = process.env.MONGODB_URI || `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`;

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // Remove these if using MongoDB version 6+ as they're deprecated
  // serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  // socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
};

// Create connection function
const dataBase = async () => {
  try {
    await mongoose.connect(mongoURI, options);
    console.log('MongoDB connected successfully');
    
    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1); // Exit process with failure
  }
};

module.exports = { dataBase, mongoose };