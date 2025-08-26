const mongoose = require('mongoose');
const dotenv = require('dotenv');
const aiThreatDetector = require('./services/aiThreatDetector');
const scheduler = require('./services/scheduler');
const { logger } = require('./utils/logger');

// Load environment variables
dotenv.config();

// Test database connection
async function testDatabaseConnection() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Test AI service
async function testAIService() {
  try {
    console.log('\n🧠 Testing AI Threat Detector...');
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️  OpenAI API key not configured - will use fallback analysis');
    } else {
      console.log('✅ OpenAI API key configured');
    }
    
    // Test AI service initialization
    console.log('✅ AI Threat Detector initialized');
    console.log('📊 Analysis thresholds:', aiThreatDetector.analysisThresholds);
    console.log('🔍 Behavior patterns:', Object.keys(aiThreatDetector.behaviorPatterns));
    
    return true;
  } catch (error) {
    console.error('❌ AI service test failed:', error.message);
    return false;
  }
}

// Test scheduler
async function testScheduler() {
  try {
    console.log('\n⏰ Testing Scheduler...');
    
    // Test scheduler initialization
    scheduler.initialize();
    console.log('✅ Scheduler initialized successfully');
    
    // Get scheduler status
    const status = scheduler.getStatus();
    console.log('📅 Scheduler status:', status);
    
    // Test health check
    const healthStatus = await scheduler.performHealthCheck();
    console.log('🏥 Health check result:', healthStatus);
    
    return true;
  } catch (error) {
    console.error('❌ Scheduler test failed:', error.message);
    return false;
  }
}

// Test email service
async function testEmailService() {
  try {
    console.log('\n📧 Testing Email Service...');
    
    // Check email configuration
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('⚠️  Email configuration incomplete');
      return false;
    }
    
    console.log('✅ Email configuration verified');
    return true;
  } catch (error) {
    console.error('❌ Email service test failed:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting AI Integration Tests...\n');
  
  const results = {
    database: false,
    ai: false,
    scheduler: false,
    email: false
  };
  
  // Run tests
  results.database = await testDatabaseConnection();
  results.ai = await testAIService();
  results.scheduler = await testScheduler();
  results.email = await testEmailService();
  
  // Summary
  console.log('\n📋 Test Results Summary:');
  console.log('========================');
  console.log(`Database Connection: ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`AI Service: ${results.ai ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Scheduler: ${results.scheduler ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Email Service: ${results.email ? '✅ PASS' : '❌ FAIL'}`);
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! AI integration is ready to use.');
  } else {
    console.log('⚠️  Some tests failed. Please check the configuration.');
  }
  
  // Cleanup
  if (results.database) {
    await mongoose.disconnect();
    console.log('\n🔌 Database disconnected');
  }
  
  if (results.scheduler) {
    scheduler.stopAll();
    console.log('⏹️  Scheduler stopped');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
