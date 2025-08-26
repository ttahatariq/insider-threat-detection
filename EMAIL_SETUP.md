# Email Configuration Setup

## Prerequisites
1. Gmail account
2. App Password (2FA must be enabled)

## Setup Steps

### 1. Enable 2-Factor Authentication on Gmail
- Go to your Google Account settings
- Navigate to Security
- Enable 2-Step Verification

### 2. Generate App Password
- Go to Google Account settings
- Navigate to Security > 2-Step Verification
- Click on "App passwords"
- Generate a new app password for "Mail"
- Copy the 16-character password

### 3. Create Environment File
Create a `.env` file in the root directory with:

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/insider_threat_detection

# Server Configuration
PORT=5500

# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Environment
NODE_ENV=development
```

### 4. Update Email Service
In `utils/emailService.js`, update the email configuration:

```javascript
const emailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'tahatariq273@gmail.com',
    pass: process.env.EMAIL_PASS || 'Taha@1391418912619261'
  }
};
```

### 5. Test Email Configuration
- Start the server
- Try downloading a file to trigger email notifications
- Check your email for security alerts

## Security Notes
- Never commit your `.env` file to version control
- Use app passwords, not your main Gmail password
- The admin email (tahatariq273@gmail.com) is hardcoded for security alerts
- All suspicious behavior will be automatically reported

## Troubleshooting
- If emails aren't sending, check your app password
- Ensure 2FA is enabled on your Gmail account
- Check server logs for email errors
- Verify your Gmail account allows "less secure app access" (not needed with app passwords)
