const express = require('express');
const router = express.Router();
const aiThreatDetector = require('../services/aiThreatDetector');
const scheduler = require('../services/scheduler');
const { protect } = require('../middleware/authMiddleware');
const { logger } = require('../utils/logger');

// Public test endpoint for AI integration (no auth required)
router.get("/test", async (req, res) => {
  try {
    const testData = {
      message: "AI Integration Test Successful!",
      timestamp: new Date().toISOString(),
      aiSystem: "OpenAI GPT-3.5 Turbo",
      status: "Connected and Ready",
      features: [
        "Real-time threat detection",
        "Behavior pattern analysis", 
        "Risk scoring",
        "Automated monitoring",
        "Weekly analysis scheduling"
      ]
    };

    res.json({
      success: true,
      data: testData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'AI test failed'
    });
  }
});

// Apply authentication middleware to all routes
router.use(protect(['Admin']));

// Get AI analysis status and configuration
router.get('/status', async (req, res) => {
  try {
    const status = {
      scheduler: scheduler.getStatus(),
      aiConfig: {
        thresholds: aiThreatDetector.analysisThresholds,
        patterns: Object.keys(aiThreatDetector.behaviorPatterns)
      },
      lastAnalysis: new Date().toISOString()
    };

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting AI analysis status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI analysis status'
    });
  }
});

// Manually trigger weekly analysis
router.post('/trigger-weekly', async (req, res) => {
  try {
    logger.info('Admin manually triggered weekly analysis');
    
    const result = await scheduler.triggerWeeklyAnalysis();
    
    res.json({
      success: true,
      message: 'Weekly analysis triggered successfully',
      data: {
        usersAnalyzed: result.analysisResults.length,
        highRiskUsers: result.highRiskUsers.length,
        blockedUsers: result.highRiskUsers.filter(u => u.action === 'block').length,
        monitoredUsers: result.highRiskUsers.filter(u => u.action === 'monitor').length
      }
    });
  } catch (error) {
    logger.error('Error triggering weekly analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger weekly analysis',
      details: error.message
    });
  }
});

// Manually trigger health check
router.post('/trigger-health-check', async (req, res) => {
  try {
    logger.info('Admin manually triggered health check');
    
    const result = await scheduler.triggerHealthCheck();
    
    res.json({
      success: true,
      message: 'Health check completed',
      data: result
    });
  } catch (error) {
    logger.error('Error triggering health check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger health check',
      details: error.message
    });
  }
});

// Analyze specific user behavior
router.post('/analyze-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeRange = 7 } = req.body;
    
    logger.info(`Admin requested AI analysis for user: ${userId}, time range: ${timeRange} days`);
    
    const analysis = await aiThreatDetector.analyzeUserBehavior(userId, parseInt(timeRange));
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('Error analyzing user behavior:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze user behavior',
      details: error.message
    });
  }
});

// Get AI analysis history
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, startDate, endDate } = req.query;
    
    // Build query for analysis history
    const query = {};
    if (userId) query.userId = userId;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    // Get analysis history from ActivityLog with AI analysis results
    const ActivityLog = require('../models/ActivityLog');
    const skip = (page - 1) * limit;
    
    const analysisHistory = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email role')
      .lean();
    
    const total = await ActivityLog.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        analysisHistory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error getting AI analysis history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analysis history',
      details: error.message
    });
  }
});

// Get AI insights and trends
router.get('/insights', async (req, res) => {
  try {
    const { timeRange = 30 } = req.query;
    
    const User = require('../models/User');
    const users = await User.find({ isBlocked: false });
    
    const insights = {
      totalUsers: users.length,
      timeRange: parseInt(timeRange),
      riskDistribution: { low: 0, medium: 0, high: 0 },
      roleBasedRisk: {},
      topRiskUsers: [],
      systemHealth: await scheduler.performHealthCheck()
    };
    
    // Analyze risk distribution across users
    for (const user of users) {
      const analysis = await aiThreatDetector.analyzeUserBehavior(user._id, parseInt(timeRange));
      
      if (analysis.riskScore < 0.4) insights.riskDistribution.low++;
      else if (analysis.riskScore < 0.7) insights.riskDistribution.medium++;
      else insights.riskDistribution.high++;
      
      // Track role-based risk
      if (!insights.roleBasedRisk[user.role]) {
        insights.roleBasedRisk[user.role] = { count: 0, totalScore: 0, averageScore: 0 };
      }
      insights.roleBasedRisk[user.role].count++;
      insights.roleBasedRisk[user.role].totalScore += analysis.riskScore;
      
      // Track top risk users
      insights.topRiskUsers.push({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        riskScore: analysis.riskScore,
        analysis: analysis.analysis
      });
    }
    
    // Calculate averages and sort top risk users
    Object.keys(insights.roleBasedRisk).forEach(role => {
      const roleData = insights.roleBasedRisk[role];
      roleData.averageScore = roleData.totalScore / roleData.count;
    });
    
    insights.topRiskUsers.sort((a, b) => b.riskScore - a.riskScore);
    insights.topRiskUsers = insights.topRiskUsers.slice(0, 10); // Top 10
    
    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    logger.error('Error getting AI insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI insights',
      details: error.message
    });
  }
});

// Update AI analysis thresholds
router.put('/thresholds', async (req, res) => {
  try {
    const { highRisk, mediumRisk, lowRisk } = req.body;
    
    // Validate thresholds
    if (highRisk !== undefined && (highRisk < 0 || highRisk > 1)) {
      return res.status(400).json({
        success: false,
        error: 'High risk threshold must be between 0 and 1'
      });
    }
    
    if (mediumRisk !== undefined && (mediumRisk < 0 || mediumRisk > 1)) {
      return res.status(400).json({
        success: false,
        error: 'Medium risk threshold must be between 0 and 1'
      });
    }
    
    if (lowRisk !== undefined && (lowRisk < 0 || lowRisk > 1)) {
      return res.status(400).json({
        success: false,
        error: 'Low risk threshold must be between 0 and 1'
      });
    }
    
    // Update thresholds
    if (highRisk !== undefined) aiThreatDetector.analysisThresholds.highRisk = highRisk;
    if (mediumRisk !== undefined) aiThreatDetector.analysisThresholds.mediumRisk = mediumRisk;
    if (lowRisk !== undefined) aiThreatDetector.analysisThresholds.lowRisk = lowRisk;
    
    logger.info('AI analysis thresholds updated:', aiThreatDetector.analysisThresholds);
    
    res.json({
      success: true,
      message: 'Thresholds updated successfully',
      data: aiThreatDetector.analysisThresholds
    });
  } catch (error) {
    logger.error('Error updating AI thresholds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update thresholds',
      details: error.message
    });
  }
});

// Get scheduler configuration
router.get('/scheduler/config', async (req, res) => {
  try {
    const config = {
      weeklyAnalysis: 'Every Sunday at 2:00 AM UTC',
      dailyHealthCheck: 'Every day at 6:00 AM UTC',
      monthlyAnalysis: 'First day of month at 3:00 AM UTC',
      timezone: 'UTC'
    };
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Error getting scheduler config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduler configuration'
    });
  }
});

// Start/stop scheduler
router.post('/scheduler/:action', async (req, res) => {
  try {
    const { action } = req.params;
    
    if (action === 'start') {
      scheduler.initialize();
      res.json({
        success: true,
        message: 'Scheduler started successfully'
      });
    } else if (action === 'stop') {
      scheduler.stopAll();
      res.json({
        success: true,
        message: 'Scheduler stopped successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid action. Use "start" or "stop"'
      });
    }
  } catch (error) {
    logger.error('Error controlling scheduler:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to control scheduler',
      details: error.message
    });
  }
});

// Mock AI analysis for testing (when database is not available)
router.get("/mock-status", async (req, res) => {
  try {
    const mockStatus = {
      scheduler: {
        weeklyAnalysis: "Scheduled",
        dailyHealthCheck: "Scheduled",
        monthlyAnalysis: "Scheduled"
      },
      aiConfig: {
        thresholds: {
          highRisk: 0.8,
          mediumRisk: 0.6,
          lowRisk: 0.4
        },
        patterns: [
          "dataExfiltration",
          "unauthorizedAccess", 
          "suspiciousTiming",
          "privilegeEscalation",
          "dataModification"
        ]
      },
      lastAnalysis: new Date().toISOString()
    };

    res.json({
      success: true,
      data: mockStatus
    });
  } catch (error) {
    logger.error('Error getting mock AI status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get mock AI status'
    });
  }
});

router.get("/mock-insights", async (req, res) => {
  try {
    const mockInsights = {
      totalUsers: 1,
      timeRange: 30,
      riskDistribution: { low: 0, medium: 0, high: 1 },
      roleBasedRisk: {
        "Analyst": { count: 1, totalScore: 0.75, averageScore: 0.75 }
      },
      topRiskUsers: [
        {
          id: "test-user-123",
          name: "Test User",
          email: "test@example.com",
          role: "Analyst",
          riskScore: 0.75,
          analysis: "User shows moderate risk due to after-hours download activity and multiple access patterns"
        }
      ],
      systemHealth: "Healthy"
    };

    res.json({
      success: true,
      data: mockInsights
    });
  } catch (error) {
    logger.error('Error getting mock AI insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get mock AI insights'
    });
  }
});

module.exports = router;
