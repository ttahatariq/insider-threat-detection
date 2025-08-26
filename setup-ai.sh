#!/bin/bash

echo "🚀 Setting up AI-Powered Insider Threat Detection System"
echo "========================================================"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Database Configuration
MONGO_URI=mongodb://localhost:27017/insider_threat_detection

# Server Configuration
PORT=5500

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# OpenAI API Configuration
OPENAI_API_KEY=your-openai-api-key-here

# JWT Secret
JWT_SECRET=your-jwt-secret-key-here

# Environment
NODE_ENV=development
EOF
    echo "✅ .env file created. Please update it with your actual values."
else
    echo "✅ .env file already exists."
fi

echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed."
else
    echo "✅ Dependencies already installed."
fi

echo ""

# Check OpenAI API key
if grep -q "your-openai-api-key-here" .env; then
    echo "⚠️  Please update your OpenAI API key in the .env file:"
    echo "   1. Go to https://openai.com/"
    echo "   2. Sign up and get your API key"
    echo "   3. Replace 'your-openai-api-key-here' in .env"
    echo ""
fi

# Check email configuration
if grep -q "your-email@gmail.com" .env; then
    echo "⚠️  Please update your email configuration in the .env file:"
    echo "   1. Use your Gmail address"
    echo "   2. Generate an app password from Google Account settings"
    echo "   3. Replace the placeholder values in .env"
    echo ""
fi

echo "🔧 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your actual values"
echo "2. Start the server: npm run dev"
echo "3. Test the integration: node test-ai-integration.js"
echo ""
echo "📚 For more information, see AI_INTEGRATION_README.md"
