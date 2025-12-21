const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Simple test without pre-save middleware
async function testSimple() {
  try {
    await mongoose.connect('mongodb://localhost:27017/test_db');
    console.log('✅ MongoDB connected');
    
    // Create a simple schema for testing
    const testSchema = new mongoose.Schema({
      name: String,
      email: { type: String, unique: true },
      password: String
    });
    
    // Add pre-save middleware directly in test
    testSchema.pre('save', async function(next) {
      console.log('🔧 Test pre-save called');
      if (this.isModified('password')) {
        console.log('Hashing password...');
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
      }
      next();
    });
    
    const TestUser = mongoose.model('TestUser', testSchema);
    
    // Clean up first
    await TestUser.deleteMany({});
    
    // Create test user
    const testUser = new TestUser({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Res@9756'
    });
    
    console.log('Creating test user...');
    await testUser.save();
    console.log('✅ Test user created');
    
    // Test password comparison
    const foundUser = await TestUser.findOne({ email: 'test@example.com' });
    console.log('\n🔍 Testing password:');
    console.log('Stored hash:', foundUser.password);
    
    const isMatch = await bcrypt.compare('Res@9756', foundUser.password);
    console.log('Password matches?', isMatch);
    
    // Clean up
    await TestUser.deleteMany({});
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testSimple();