#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up environment configuration...\n');

const envContent = `# OpenAI API Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Database Configuration
MONGO_URI=mongodb://localhost:27017/insider_threat_detection

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# JWT Secret
JWT_SECRET=your-jwt-secret-key-here

# Server Configuration
PORT=5500
NODE_ENV=development
`;

const envPath = path.join(__dirname, '.env');

try {
  if (fs.existsSync(envPath)) {
    console.log('✅ .env file already exists');
    console.log('📝 Current .env content:');
    console.log('─'.repeat(50));
    console.log(fs.readFileSync(envPath, 'utf8'));
    console.log('─'.repeat(50));
  } else {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully');
    console.log('📝 Please update the following values in your .env file:');
    console.log('   1. OPENAI_API_KEY - Your OpenAI API key (starts with sk-)');
    console.log('   2. EMAIL_USER - Your email address');
    console.log('   3. EMAIL_PASS - Your email app password');
    console.log('   4. JWT_SECRET - A random secret key for JWT tokens');
    console.log('   5. MONGO_URI - Your MongoDB connection string (if different)');
  }
  
  console.log('\n🔍 To get your OpenAI API key:');
  console.log('   1. Go to https://platform.openai.com/api-keys');
  console.log('   2. Create a new API key');
  console.log('   3. Copy the key (starts with sk-)');
  console.log('   4. Replace "your-openai-api-key-here" in .env file');
  
  console.log('\n🚀 After updating .env, restart your server:');
  console.log('   npm run dev');
  
} catch (error) {
  console.error('❌ Error setting up environment:', error.message);
  process.exit(1);
}
