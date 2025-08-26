# AI-Powered Insider Threat Detection System

This system integrates OpenAI's GPT models to automatically analyze user behavior patterns and detect potential insider threats on a weekly basis.

## 🚀 Features

### AI-Powered Analysis
- **Weekly Automated Analysis**: Runs every Sunday at 2:00 AM UTC
- **Real-time Risk Scoring**: Uses AI to analyze behavior patterns and assign risk scores
- **Intelligent Pattern Recognition**: Detects unusual access patterns, timing anomalies, and suspicious behavior
- **Fallback Analysis**: Rule-based analysis when AI is unavailable

### Automated Actions
- **User Blocking**: Automatically blocks users with high risk scores (≥80%)
- **Monitoring**: Flags users with medium risk scores (≥60%) for enhanced monitoring
- **Admin Alerts**: Sends detailed email notifications about suspicious activities
- **Weekly Reports**: Comprehensive summaries sent to administrators

### Scheduling & Monitoring
- **Automated Scheduling**: Uses node-cron for reliable task execution
- **Health Checks**: Daily system health monitoring at 6:00 AM UTC
- **Monthly Analysis**: Extended 30-day analysis on the first of each month
- **Manual Triggers**: Admin can manually trigger analysis when needed

## 🛠️ Setup Instructions

### 1. Install Dependencies
```bash
npm install openai node-cron
```

### 2. Environment Variables
Create a `.env` file with the following variables:

```env
# OpenAI API Configuration
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
```

### 3. OpenAI API Key
1. Sign up at [OpenAI](https://openai.com/)
2. Get your API key from the dashboard
3. Add it to your `.env` file

### 4. Start the System
```bash
npm run dev
```

The scheduler will automatically initialize when the server starts.

## 📊 How It Works

### Weekly Analysis Process
1. **Data Collection**: Gathers all user activities from the past 7 days
2. **AI Analysis**: Sends behavior data to OpenAI for pattern analysis
3. **Risk Assessment**: AI returns risk scores and recommendations
4. **Action Execution**: Automatically blocks high-risk users or flags for monitoring
5. **Notification**: Sends detailed reports to administrators

### AI Analysis Components
- **Time Distribution**: Analyzes when users are most active
- **Action Patterns**: Identifies unusual sequences of actions
- **Access Patterns**: Detects rapid succession and unusual timing
- **Role-based Analysis**: Considers user roles in risk assessment
- **IP Address Tracking**: Monitors for suspicious access locations

### Risk Scoring
- **0.0 - 0.4**: Low Risk (Normal behavior)
- **0.4 - 0.7**: Medium Risk (Monitor closely)
- **0.7 - 1.0**: High Risk (Block immediately)

## 🔧 API Endpoints

### AI Analysis Routes
All routes require Admin authentication.

#### Get System Status
```
GET /api/ai-analysis/status
```

#### Trigger Weekly Analysis
```
POST /api/ai-analysis/trigger-weekly
```

#### Trigger Health Check
```
POST /api/ai-analysis/trigger-health-check
```

#### Analyze Specific User
```
POST /api/ai-analysis/analyze-user/:userId
Body: { "timeRange": 7 }
```

#### Get Analysis History
```
GET /api/ai-analysis/history?page=1&limit=20&userId=123&startDate=2024-01-01
```

#### Get AI Insights
```
GET /api/ai-analysis/insights?timeRange=30
```

#### Update Thresholds
```
PUT /api/ai-analysis/thresholds
Body: { "highRisk": 0.8, "mediumRisk": 0.6, "lowRisk": 0.4 }
```

#### Scheduler Control
```
POST /api/ai-analysis/scheduler/start
POST /api/ai-analysis/scheduler/stop
```

## 📅 Scheduling Configuration

### Weekly Analysis
- **Schedule**: Every Sunday at 2:00 AM UTC
- **Purpose**: Comprehensive user behavior analysis
- **Actions**: Block high-risk users, flag medium-risk users

### Daily Health Check
- **Schedule**: Every day at 6:00 AM UTC
- **Purpose**: System health monitoring
- **Checks**: Database connection, API keys, email configuration

### Monthly Analysis
- **Schedule**: First day of month at 3:00 AM UTC
- **Purpose**: Extended 30-day trend analysis
- **Output**: Comprehensive monthly report

## 🎯 AI Analysis Features

### Behavior Pattern Detection
- **Data Exfiltration**: Downloads, exports, file transfers
- **Unauthorized Access**: Unusual file access patterns
- **Suspicious Timing**: After-hours activity, weekend access
- **Privilege Escalation**: Admin access attempts
- **Data Modification**: Unusual file changes

### Risk Factors
- **High download activity** during work hours
- **Multiple IP addresses** used by same user
- **Rapid succession** of actions
- **After-hours activity** exceeding normal patterns
- **Role violations** (e.g., intern accessing admin files)

## 📧 Email Notifications

### Admin Alerts
- **Immediate notifications** for high-risk activities
- **Detailed analysis** with AI insights
- **Action recommendations** for administrators
- **Risk score breakdowns** with explanations

### Weekly Reports
- **Summary statistics** for all users
- **AI insights** and trend analysis
- **User violation details** with risk scores
- **Action taken** summaries

## 🔍 Monitoring & Debugging

### Logs
The system logs all activities to help with debugging:
- AI analysis results
- User blocking actions
- Email notifications
- Scheduler operations

### Health Checks
Daily health checks monitor:
- Database connectivity
- API key validity
- Email configuration
- Recent activity logs
- Blocked user counts

### Manual Triggers
Admins can manually:
- Trigger weekly analysis
- Run health checks
- Analyze specific users
- Control scheduler

## 🚨 Troubleshooting

### Common Issues

#### OpenAI API Errors
- Check API key validity
- Verify API quota and billing
- Check network connectivity

#### Scheduler Not Running
- Verify server startup logs
- Check cron job status
- Ensure proper timezone configuration

#### Email Notifications Failing
- Verify email credentials
- Check SMTP settings
- Ensure proper email permissions

### Debug Commands
```bash
# Check scheduler status
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5500/api/ai-analysis/status

# Manually trigger analysis
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5500/api/ai-analysis/trigger-weekly

# Check health status
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5500/api/ai-analysis/trigger-health-check
```

## 🔒 Security Considerations

### Data Privacy
- User activity data is analyzed locally before sending to OpenAI
- Only aggregated patterns are sent to AI service
- No sensitive file contents are transmitted

### Access Control
- All AI analysis routes require Admin authentication
- User data is protected by role-based access control
- Audit logs track all administrative actions

### Rate Limiting
- OpenAI API calls are rate-limited to prevent abuse
- Fallback analysis ensures system continues working
- Health checks monitor API usage

## 📈 Performance Optimization

### Analysis Efficiency
- Batch processing for multiple users
- Caching of analysis results
- Asynchronous processing for non-blocking operations

### Database Optimization
- Indexed queries for activity logs
- Aggregated data storage for trends
- Efficient pagination for large datasets

### AI Integration
- Structured prompts for consistent analysis
- Fallback mechanisms for reliability
- Configurable thresholds for flexibility

## 🔮 Future Enhancements

### Planned Features
- **Machine Learning Models**: Custom ML models for specific industries
- **Real-time Analysis**: Continuous monitoring instead of weekly batches
- **Advanced Analytics**: More sophisticated pattern recognition
- **Integration APIs**: Connect with other security tools

### Customization Options
- **Industry-specific Rules**: Tailored for different business types
- **Custom Risk Factors**: Company-specific threat indicators
- **Flexible Scheduling**: Configurable analysis intervals
- **Multi-tenant Support**: Separate analysis for different organizations

## 📞 Support

For technical support or questions about the AI integration:
1. Check the logs for error messages
2. Verify environment variable configuration
3. Test API endpoints manually
4. Review the troubleshooting section above

## 📄 License

This AI integration is part of the Insider Threat Detection System and follows the same licensing terms.
