# OpenAI API Quota Error Solutions

## 🚨 Problem Summary

Your insider threat detection system is encountering OpenAI API quota exceeded errors (429 status code). This happens when you've used up your allocated API credits or hit rate limits.

## ✅ Immediate Solutions Implemented

### 1. Enhanced Error Handling
- **Specific Error Detection**: Now properly handles quota exceeded, rate limit, and API key errors
- **Graceful Fallback**: Automatically switches to rule-based analysis when AI is unavailable
- **Temporary AI Disable**: Prevents repeated quota errors by temporarily disabling AI calls
- **Detailed Logging**: Better error tracking and reporting

### 2. Improved Fallback Analysis
- **Enhanced Rule Engine**: More sophisticated pattern detection in fallback mode
- **Risk Level Classification**: Clear Low/Medium/High risk categorization
- **Detailed Warnings**: Specific warnings about detected patterns
- **Analysis Method Tracking**: Clear indication when fallback is used

### 3. New API Endpoints
- `POST /api/ai-analysis/reset-ai` - Reset AI availability after quota issues
- `GET /api/ai-analysis/ai-errors` - Get detailed error information and recommendations
- Enhanced status endpoint with AI availability information

## 🔧 How to Fix the Quota Issue

### Option 1: Check and Upgrade OpenAI Plan
1. **Check Current Usage**:
   ```bash
   # Visit OpenAI dashboard: https://platform.openai.com/usage
   # Check your current usage and billing
   ```

2. **Upgrade Plan**:
   - Go to OpenAI billing settings
   - Add payment method if not already added
   - Increase spending limits
   - Consider upgrading to a higher tier plan

### Option 2: Optimize API Usage
1. **Reduce Analysis Frequency**:
   ```javascript
   // In scheduler.js, change weekly analysis to monthly
   // Or reduce the number of users analyzed per batch
   ```

2. **Implement Caching**:
   ```javascript
   // Cache analysis results to avoid re-analyzing same data
   // Only analyze users with new activity
   ```

3. **Batch Processing**:
   ```javascript
   // Process multiple users in single API call
   // Use more efficient prompts
   ```

### Option 3: Use Alternative AI Services
1. **Anthropic Claude**:
   ```bash
   npm install @anthropic-ai/sdk
   ```

2. **Google Gemini**:
   ```bash
   npm install @google/generative-ai
   ```

3. **Local AI Models**:
   ```bash
   # Use Ollama or similar for local inference
   npm install ollama
   ```

## 🛠️ Immediate Actions You Can Take

### 1. Check Current Status
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5500/api/ai-analysis/status
```

### 2. Reset AI After Fixing Quota
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5500/api/ai-analysis/reset-ai
```

### 3. Get Error Details
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5500/api/ai-analysis/ai-errors
```

## 📊 System Behavior with Quota Issues

### What Happens Now:
1. **First Quota Error**: System logs warning and switches to fallback analysis
2. **AI Disabled**: Temporarily disables AI to prevent repeated errors
3. **Fallback Analysis**: Uses enhanced rule-based analysis
4. **Continued Monitoring**: System continues to work with fallback rules
5. **Admin Notifications**: You'll receive alerts about the quota issue

### Fallback Analysis Features:
- ✅ After-hours activity detection
- ✅ Rapid succession pattern detection
- ✅ Download activity monitoring
- ✅ IP address tracking
- ✅ Unusual timing analysis
- ✅ Repetitive action detection

## 🔄 Recovery Process

### When Quota is Restored:
1. **Check Status**: Use the status endpoint to verify AI availability
2. **Reset AI**: Use the reset endpoint to re-enable AI analysis
3. **Test Analysis**: Run a manual analysis to verify everything works
4. **Monitor**: Watch logs to ensure no more quota errors

### Manual Testing:
```bash
# Test AI analysis on specific user
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"timeRange": 7}' \
  http://localhost:5500/api/ai-analysis/analyze-user/USER_ID
```

## 📈 Cost Optimization Strategies

### 1. Reduce API Calls
- **Batch Analysis**: Analyze multiple users in single API call
- **Smart Scheduling**: Only analyze users with recent activity
- **Caching**: Store results to avoid re-analysis

### 2. Optimize Prompts
- **Shorter Prompts**: Reduce token usage per request
- **Efficient Models**: Use GPT-3.5-turbo instead of GPT-4
- **Structured Output**: Use JSON mode for consistent responses

### 3. Implement Rate Limiting
```javascript
// Add rate limiting to prevent quota exhaustion
const rateLimit = require('express-rate-limit');

const aiAnalysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many AI analysis requests, please try again later.'
});
```

## 🚀 Alternative Solutions

### 1. Hybrid Approach
- Use AI for high-priority users only
- Use rule-based analysis for others
- Implement user risk prioritization

### 2. Local AI Models
- Deploy Ollama with local models
- Use open-source alternatives
- Reduce external API dependency

### 3. Scheduled Analysis
- Reduce analysis frequency
- Analyze only during off-peak hours
- Implement smart batching

## 📞 Support and Monitoring

### Log Monitoring:
```bash
# Check logs for quota errors
tail -f logs/app.log | grep -i "quota\|rate.*limit\|insufficient"
```

### Health Checks:
```bash
# Run health check
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5500/api/ai-analysis/trigger-health-check
```

### System Status:
```bash
# Check overall system status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5500/api/ai-analysis/status
```

## 🎯 Next Steps

1. **Immediate**: Check your OpenAI billing and add credits
2. **Short-term**: Implement the optimizations above
3. **Long-term**: Consider alternative AI services or local models
4. **Monitoring**: Set up alerts for quota usage

## 📋 Checklist

- [ ] Check OpenAI billing dashboard
- [ ] Add payment method if needed
- [ ] Increase spending limits
- [ ] Test AI reset endpoint
- [ ] Verify fallback analysis is working
- [ ] Monitor system logs
- [ ] Consider implementing optimizations
- [ ] Set up quota monitoring alerts

---

**Note**: The system will continue to function with fallback analysis even without AI. The enhanced error handling ensures you won't see repeated quota errors, and the fallback analysis provides reasonable threat detection capabilities.
