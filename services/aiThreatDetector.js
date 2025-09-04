const OpenAI = require('openai');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const { sendAdminAlert, sendWeeklySummary } = require('../utils/emailService');
const { logger } = require('../utils/logger');

class AIThreatDetector {
  constructor() {
    // Initialize OpenAI client only if API key is available
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      this.aiAvailable = true;
      console.log('✅ OpenAI API key configured successfully');
    } else {
      this.openai = null;
      this.aiAvailable = false;
      if (!process.env.OPENAI_API_KEY) {
        console.log('⚠️  OpenAI API key not found in environment variables');
      } else if (process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
        console.log('⚠️  OpenAI API key is still set to placeholder value. Please update your .env file');
      }
      console.log('⚠️  AI analysis will use fallback rules.');
    }
    
    this.analysisThresholds = {
      highRisk: 0.8,
      mediumRisk: 0.6,
      lowRisk: 0.4
    };
    
    this.behaviorPatterns = {
      dataExfiltration: ['download', 'export', 'copy', 'transfer'],
      unauthorizedAccess: ['access', 'view', 'open', 'read'],
      suspiciousTiming: ['after_hours', 'weekend', 'holiday'],
      privilegeEscalation: ['admin', 'root', 'sudo', 'elevate'],
      dataModification: ['modify', 'delete', 'update', 'change']
    };
  }

  // Analyze user behavior patterns using AI
  async analyzeUserBehavior(userId, timeRange = 7) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      // Get all user activities for the time period
      const activities = await ActivityLog.find({
        userId,
        timestamp: { $gte: startDate, $lte: endDate }
      }).sort({ timestamp: 1 });

      if (activities.length === 0) {
        return { riskScore: 0, analysis: 'No activity detected', recommendations: [] };
      }

      // Prepare data for AI analysis
      const analysisData = this.prepareAnalysisData(activities);
      
      // Get AI analysis
      const aiAnalysis = await this.getAIAnalysis(analysisData);
      
      return aiAnalysis;
    } catch (error) {
      console.error('Error analyzing user behavior:', error);
      return { riskScore: 0.5, analysis: 'Analysis failed', recommendations: ['Manual review required'] };
    }
  }

  // Prepare data for AI analysis
  prepareAnalysisData(activities) {
    const user = activities[0]?.userId;
    const role = activities[0]?.role;
    
    // Group activities by type and time
    const activitySummary = {
      totalActivities: activities.length,
      uniqueActions: [...new Set(activities.map(a => a.action))],
      timeDistribution: this.analyzeTimeDistribution(activities),
      actionFrequency: this.getActionFrequency(activities),
      riskScores: activities.map(a => a.additionalData?.riskScore || 0),
      workHoursActivity: activities.filter(a => a.additionalData?.workHours).length,
      afterHoursActivity: activities.filter(a => !a.additionalData?.workHours).length,
      downloadActivity: activities.filter(a => a.action.toLowerCase().includes('download')).length,
      accessPatterns: this.analyzeAccessPatterns(activities),
      ipAddresses: [...new Set(activities.map(a => a.ipAddress).filter(Boolean))]
    };

    return {
      user: { id: user, role },
      activities: activities.length,
      summary: activitySummary,
      rawData: activities.slice(-20) // Last 20 activities for detailed analysis
    };
  }

  // Analyze time distribution of activities
  analyzeTimeDistribution(activities) {
    const hourlyDistribution = new Array(24).fill(0);
    const dailyDistribution = new Array(7).fill(0);
    
    activities.forEach(activity => {
      const date = new Date(activity.timestamp);
      hourlyDistribution[date.getHours()]++;
      dailyDistribution[date.getDay()]++;
    });

    return { hourly: hourlyDistribution, daily: dailyDistribution };
  }

  // Get frequency of different actions
  getActionFrequency(activities) {
    const frequency = {};
    activities.forEach(activity => {
      const action = activity.action.toLowerCase();
      frequency[action] = (frequency[action] || 0) + 1;
    });
    return frequency;
  }

  // Analyze access patterns
  analyzeAccessPatterns(activities) {
    const patterns = {
      rapidSuccession: 0, // Multiple actions in short time
      unusualHours: 0,    // Actions outside normal hours
      repetitiveActions: 0, // Same action repeated
      mixedActions: 0     // Different types of actions
    };

    for (let i = 1; i < activities.length; i++) {
      const timeDiff = activities[i].timestamp - activities[i-1].timestamp;
      if (timeDiff < 60000) patterns.rapidSuccession++; // Less than 1 minute
      
      const hour = new Date(activities[i].timestamp).getHours();
      if (hour < 6 || hour > 22) patterns.unusualHours++;
      
      if (i > 0 && activities[i].action === activities[i-1].action) {
        patterns.repetitiveActions++;
      }
    }

    patterns.mixedActions = new Set(activities.map(a => a.action)).size;
    return patterns;
  }

  // Get AI analysis from OpenAI
  async getAIAnalysis(analysisData) {
    // If AI is not available, use fallback analysis
    if (!this.aiAvailable || !this.openai) {
      console.log('AI not available, using fallback analysis');
      return this.fallbackAnalysis(analysisData);
    }
    
    try {
      const prompt = this.buildAnalysisPrompt(analysisData);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a cybersecurity expert specializing in insider threat detection. Analyze user behavior patterns and provide risk assessment with specific recommendations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      const analysis = completion.choices[0].message.content;
      
      // Parse AI response to extract risk score and recommendations
      const parsedAnalysis = this.parseAIAnalysis(analysis);
      
      return {
        riskScore: parsedAnalysis.riskScore,
        analysis: parsedAnalysis.analysis,
        recommendations: parsedAnalysis.recommendations,
        aiResponse: analysis
      };
    } catch (error) {
      // Handle specific OpenAI API errors
      if (error.code === 'insufficient_quota' || error.status === 429) {
        console.warn('⚠️  OpenAI API quota exceeded. Switching to fallback analysis.');
        logger.warn('OpenAI API quota exceeded - using fallback analysis', {
          error: error.message,
          code: error.code,
          status: error.status
        });
        
        // Disable AI temporarily to prevent repeated quota errors
        this.aiAvailable = false;
        this.openai = null;
        
        return {
          ...this.fallbackAnalysis(analysisData),
          aiResponse: 'AI analysis unavailable due to quota exceeded - using fallback rules',
          quotaExceeded: true
        };
      } else if (error.code === 'invalid_api_key') {
        console.error('❌ Invalid OpenAI API key. Please check your configuration.');
        logger.error('Invalid OpenAI API key', { error: error.message });
        this.aiAvailable = false;
        this.openai = null;
        
        return {
          ...this.fallbackAnalysis(analysisData),
          aiResponse: 'AI analysis unavailable due to invalid API key - using fallback rules',
          apiKeyError: true
        };
      } else if (error.code === 'rate_limit_exceeded') {
        console.warn('⚠️  OpenAI API rate limit exceeded. Retrying with fallback analysis.');
        logger.warn('OpenAI API rate limit exceeded', { error: error.message });
        
        return {
          ...this.fallbackAnalysis(analysisData),
          aiResponse: 'AI analysis temporarily unavailable due to rate limits - using fallback rules',
          rateLimited: true
        };
      } else {
        console.error('OpenAI API error:', error);
        logger.error('OpenAI API error', { 
          error: error.message, 
          code: error.code, 
          status: error.status 
        });
        
        return {
          ...this.fallbackAnalysis(analysisData),
          aiResponse: 'AI analysis failed - using fallback rules',
          aiError: true
        };
      }
    }
  }

  // Build prompt for AI analysis
  buildAnalysisPrompt(analysisData) {
    return `
Analyze this user behavior data for potential insider threats:

User Role: ${analysisData.user.role}
Total Activities: ${analysisData.summary.totalActivities}
Time Period: Last 7 days

Activity Summary:
- Work Hours Activity: ${analysisData.summary.workHoursActivity}
- After Hours Activity: ${analysisData.summary.afterHoursActivity}
- Download Activity: ${analysisData.summary.downloadActivity}
- Unique Actions: ${analysisData.summary.uniqueActions ? analysisData.summary.uniqueActions.join(', ') : 'None'}
- IP Addresses Used: ${analysisData.summary.ipAddresses ? analysisData.summary.ipAddresses.join(', ') : 'None'}

Access Patterns:
- Rapid Succession Actions: ${analysisData.summary.accessPatterns.rapidSuccession}
- Unusual Hours Activity: ${analysisData.summary.accessPatterns.unusualHours}
- Repetitive Actions: ${analysisData.summary.accessPatterns.repetitiveActions}
- Action Variety: ${analysisData.summary.accessPatterns.mixedActions}

Risk Scores: ${analysisData.summary.riskScores ? analysisData.summary.riskScores.join(', ') : 'None'}

Provide:
1. Risk Score (0.0-1.0) - 0.0 = No risk, 1.0 = High risk
2. Analysis summary (2-3 sentences)
3. Specific recommendations (3-5 bullet points)

Format your response as:
RISK_SCORE: [score]
ANALYSIS: [analysis]
RECOMMENDATIONS:
- [recommendation 1]
- [recommendation 2]
- [recommendation 3]
`;
  }

  // Parse AI response
  parseAIAnalysis(aiResponse) {
    try {
      const riskScoreMatch = aiResponse.match(/RISK_SCORE:\s*([0-9.]+)/i);
      const analysisMatch = aiResponse.match(/ANALYSIS:\s*(.+?)(?=\n|RECOMMENDATIONS:)/is);
      const recommendationsMatch = aiResponse.match(/RECOMMENDATIONS:\s*((?:- .+\n?)+)/is);

      const riskScore = riskScoreMatch ? parseFloat(riskScoreMatch[1]) : 0.5;
      const analysis = analysisMatch ? analysisMatch[1].trim() : 'Analysis parsing failed';
      const recommendations = recommendationsMatch 
        ? recommendationsMatch[1].split('\n').filter(r => r.trim().startsWith('-')).map(r => r.trim().substring(2))
        : ['Manual review required'];

      return { riskScore, analysis, recommendations };
    } catch (error) {
      console.error('Error parsing AI analysis:', error);
      return { riskScore: 0.5, analysis: 'Analysis parsing failed', recommendations: ['Manual review required'] };
    }
  }

  // Fallback analysis when AI fails
  fallbackAnalysis(analysisData) {
    let riskScore = 0;
    const recommendations = [];
    const warnings = [];

    // Calculate risk based on patterns
    if (analysisData.summary.afterHoursActivity > analysisData.summary.workHoursActivity * 0.3) {
      riskScore += 0.2;
      recommendations.push('High after-hours activity detected');
      warnings.push(`After-hours activity: ${analysisData.summary.afterHoursActivity} vs work hours: ${analysisData.summary.workHoursActivity}`);
    }

    if (analysisData.summary.accessPatterns.rapidSuccession > 5) {
      riskScore += 0.2;
      recommendations.push('Rapid succession of actions detected');
      warnings.push(`Rapid succession actions: ${analysisData.summary.accessPatterns.rapidSuccession}`);
    }

    if (analysisData.summary.downloadActivity > 10) {
      riskScore += 0.2;
      recommendations.push('High download activity detected');
      warnings.push(`Download activity: ${analysisData.summary.downloadActivity} files`);
    }

    if (analysisData.summary.ipAddresses.length > 3) {
      riskScore += 0.1;
      recommendations.push('Multiple IP addresses used');
      warnings.push(`IP addresses used: ${analysisData.summary.ipAddresses.length} different locations`);
    }

    // Check for unusual access patterns
    if (analysisData.summary.accessPatterns.unusualHours > analysisData.summary.totalActivities * 0.4) {
      riskScore += 0.15;
      recommendations.push('High percentage of unusual hours activity');
      warnings.push(`Unusual hours activity: ${analysisData.summary.accessPatterns.unusualHours} out of ${analysisData.summary.totalActivities} total activities`);
    }

    // Check for repetitive actions (potential automation)
    if (analysisData.summary.accessPatterns.repetitiveActions > analysisData.summary.totalActivities * 0.5) {
      riskScore += 0.1;
      recommendations.push('High repetitive action pattern detected');
      warnings.push(`Repetitive actions: ${analysisData.summary.accessPatterns.repetitiveActions} out of ${analysisData.summary.totalActivities} total activities`);
    }

    // Calculate average risk from individual activity scores
    const avgRiskScore = analysisData.summary.riskScores.length > 0 
      ? analysisData.summary.riskScores.reduce((a, b) => a + b, 0) / analysisData.summary.riskScores.length
      : 0;
    riskScore += avgRiskScore * 0.3;

    riskScore = Math.min(riskScore, 1.0);

    // Determine risk level
    let riskLevel = 'Low';
    if (riskScore >= this.analysisThresholds.highRisk) riskLevel = 'High';
    else if (riskScore >= this.analysisThresholds.mediumRisk) riskLevel = 'Medium';

    return {
      riskScore,
      riskLevel,
      analysis: `Fallback analysis (${riskLevel} Risk): ${riskScore > 0.6 ? 'Suspicious patterns detected' : 'Normal behavior patterns'}`,
      recommendations: recommendations.length > 0 ? recommendations : ['No immediate concerns detected'],
      warnings: warnings,
      fallbackUsed: true,
      analysisMethod: 'Rule-based fallback'
    };
  }

  // Check and reset AI availability
  checkAIAvailability() {
    if (process.env.OPENAI_API_KEY && !this.openai) {
      try {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        this.aiAvailable = true;
        console.log('✅ OpenAI API re-enabled');
        logger.info('OpenAI API re-enabled after previous error');
        return true;
      } catch (error) {
        console.error('Failed to re-enable OpenAI API:', error);
        return false;
      }
    }
    return this.aiAvailable;
  }

  // Get system status including AI availability
  getSystemStatus() {
    return {
      aiAvailable: this.aiAvailable,
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      thresholds: this.analysisThresholds,
      patterns: Object.keys(this.behaviorPatterns),
      lastCheck: new Date().toISOString()
    };
  }

  // Weekly analysis for all users
  async performWeeklyAnalysis() {
    try {
      console.log('Starting weekly AI-powered threat analysis...');
      
      const users = await User.find({ isBlocked: false });
      const analysisResults = [];
      const highRiskUsers = [];

      for (const user of users) {
        console.log(`Analyzing user: ${user.email}`);
        
        const analysis = await this.analyzeUserBehavior(user._id, 7);
        analysisResults.push({
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          analysis
        });

        // Check if user should be blocked based on AI analysis
        if (analysis.riskScore >= this.analysisThresholds.highRisk) {
          highRiskUsers.push({
            user,
            analysis,
            action: 'block'
          });
        } else if (analysis.riskScore >= this.analysisThresholds.mediumRisk) {
          highRiskUsers.push({
            user,
            analysis,
            action: 'monitor'
          });
        }
      }

      // Apply actions based on analysis
      await this.applyWeeklyAnalysisActions(highRiskUsers);

      // Send weekly summary
      const summaryData = await this.generateWeeklySummary(analysisResults, highRiskUsers);
      await sendWeeklySummary(summaryData);

      console.log(`Weekly analysis completed. ${highRiskUsers.length} users flagged for action.`);
      
      return { analysisResults, highRiskUsers, summaryData };
    } catch (error) {
      console.error('Error in weekly analysis:', error);
      throw error;
    }
  }

  // Apply actions based on weekly analysis
  async applyWeeklyAnalysisActions(highRiskUsers) {
    for (const item of highRiskUsers) {
      try {
        if (item.action === 'block') {
          // Block user
          item.user.isBlocked = true;
          item.user.blockedAt = new Date();
          item.user.riskNotes.push({
            reason: `AI Analysis: High risk score ${(item.analysis.riskScore * 100).toFixed(1)}% - ${item.analysis.analysis}`,
            timestamp: new Date(),
            action: 'block'
          });
          
          await item.user.save();
          
          // Send admin alert
          await sendAdminAlert(
            item.user,
            'AI Analysis: User Blocked',
            item.analysis.riskScore,
            `User blocked based on AI analysis. Risk Score: ${(item.analysis.riskScore * 100).toFixed(1)}%. Analysis: ${item.analysis.analysis}`
          );
          
          console.log(`User ${item.user.email} blocked based on AI analysis`);
        } else if (item.action === 'monitor') {
          // Add monitoring note
          item.user.riskNotes.push({
            reason: `AI Analysis: Medium risk score ${(item.analysis.riskScore * 100).toFixed(1)}% - ${item.analysis.analysis}`,
            timestamp: new Date(),
            action: 'monitor'
          });
          
          await item.user.save();
          
          // Send admin alert for monitoring
          await sendAdminAlert(
            item.user,
            'AI Analysis: User Under Monitoring',
            item.analysis.riskScore,
            `User flagged for monitoring based on AI analysis. Risk Score: ${(item.analysis.riskScore * 100).toFixed(1)}%. Analysis: ${item.analysis.analysis}`
          );
          
          console.log(`User ${item.user.email} flagged for monitoring based on AI analysis`);
        }
      } catch (error) {
        console.error(`Error applying action for user ${item.user.email}:`, error);
      }
    }
  }

  // Generate weekly summary data
  async generateWeeklySummary(analysisResults, highRiskUsers) {
    const blockedUsers = highRiskUsers.filter(item => item.action === 'block').length;
    const monitoredUsers = highRiskUsers.filter(item => item.action === 'monitor').length;
    
    const userViolations = highRiskUsers.map(item => ({
      name: item.user.name,
      email: item.user.email,
      role: item.user.role,
      violationCount: 1,
      avgRiskScore: item.analysis.riskScore,
      action: item.action,
      analysis: item.analysis.analysis
    }));

    return {
      totalSuspicious: highRiskUsers.length,
      usersWithViolations: highRiskUsers.length,
      blockedUsers,
      monitoredUsers,
      period: `AI Analysis - Last 7 days (${new Date().toLocaleDateString()})`,
      userViolations,
      aiInsights: {
        totalUsersAnalyzed: analysisResults.length,
        averageRiskScore: analysisResults.reduce((sum, r) => sum + r.analysis.riskScore, 0) / analysisResults.length,
        highRiskPercentage: (highRiskUsers.length / analysisResults.length * 100).toFixed(1)
      }
    };
  }
}

module.exports = new AIThreatDetector();
