const cron = require('node-cron');
const aiThreatDetector = require('./aiThreatDetector');
const { logger } = require('../utils/logger');

class Scheduler {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  // Initialize all scheduled jobs
  initialize() {
    if (this.isInitialized) {
      logger.info('Scheduler already initialized');
      return;
    }

    try {
      // Schedule weekly AI analysis - Every Sunday at 2:00 AM
      this.scheduleWeeklyAnalysis();
      
      // Schedule daily health check - Every day at 6:00 AM
      this.scheduleDailyHealthCheck();
      
      // Schedule monthly comprehensive analysis - First day of month at 3:00 AM
      this.scheduleMonthlyAnalysis();
      
      this.isInitialized = true;
      logger.info('Scheduler initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize scheduler:', error);
      throw error;
    }
  }

  // Schedule weekly AI analysis
  scheduleWeeklyAnalysis() {
    const job = cron.schedule('0 2 * * 0', async () => {
      try {
        logger.info('Starting scheduled weekly AI analysis...');
        
        const startTime = Date.now();
        const result = await aiThreatDetector.performWeeklyAnalysis();
        const duration = Date.now() - startTime;
        
        logger.info(`Weekly AI analysis completed in ${duration}ms`, {
          usersAnalyzed: result.analysisResults.length,
          highRiskUsers: result.highRiskUsers.length,
          blockedUsers: result.highRiskUsers.filter(u => u.action === 'block').length,
          monitoredUsers: result.highRiskUsers.filter(u => u.action === 'monitor').length
        });
        
        // Log detailed results for audit
        if (result.highRiskUsers.length > 0) {
          logger.warn('High-risk users detected in weekly analysis:', 
            result.highRiskUsers.map(u => ({
              email: u.user.email,
              role: u.user.role,
              riskScore: u.analysis.riskScore,
              action: u.action
            }))
          );
        }
        
      } catch (error) {
        logger.error('Weekly AI analysis failed:', error);
        
        // Send alert to admin about scheduler failure
        try {
          const { sendAdminAlert } = require('../utils/emailService');
          await sendAdminAlert(
            { name: 'System', email: 'system@company.com', role: 'System' },
            'Weekly AI Analysis Failed',
            0.9,
            `Weekly AI analysis failed with error: ${error.message}. Manual intervention required.`
          );
        } catch (emailError) {
          logger.error('Failed to send admin alert about scheduler failure:', emailError);
        }
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    this.jobs.set('weeklyAnalysis', job);
    logger.info('Weekly AI analysis scheduled for every Sunday at 2:00 AM UTC');
  }

  // Schedule daily health check
  scheduleDailyHealthCheck() {
    const job = cron.schedule('0 6 * * *', async () => {
      try {
        logger.info('Starting daily health check...');
        
        // Check system health
        const healthStatus = await this.performHealthCheck();
        
        if (healthStatus.isHealthy) {
          logger.info('Daily health check passed');
        } else {
          logger.warn('Daily health check failed:', healthStatus.issues);
          
          // Send alert if critical issues found
          if (healthStatus.criticalIssues > 0) {
            try {
              const { sendAdminAlert } = require('../utils/emailService');
              await sendAdminAlert(
                { name: 'System', email: 'system@company.com', role: 'System' },
                'Daily Health Check Failed',
                0.7,
                `Daily health check failed with ${healthStatus.criticalIssues} critical issues. Please review system logs.`
              );
            } catch (emailError) {
              logger.error('Failed to send admin alert about health check failure:', emailError);
            }
          }
        }
        
      } catch (error) {
        logger.error('Daily health check failed:', error);
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    this.jobs.set('dailyHealthCheck', job);
    logger.info('Daily health check scheduled for every day at 6:00 AM UTC');
  }

  // Schedule monthly comprehensive analysis
  scheduleMonthlyAnalysis() {
    const job = cron.schedule('0 3 1 * *', async () => {
      try {
        logger.info('Starting monthly comprehensive analysis...');
        
        // Perform extended analysis (last 30 days)
        const startTime = Date.now();
        const result = await this.performMonthlyAnalysis();
        const duration = Date.now() - startTime;
        
        logger.info(`Monthly analysis completed in ${duration}ms`, {
          usersAnalyzed: result.analysisResults.length,
          highRiskUsers: result.highRiskUsers.length,
          trends: result.trends
        });
        
        // Generate monthly report
        await this.generateMonthlyReport(result);
        
      } catch (error) {
        logger.error('Monthly analysis failed:', error);
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    this.jobs.set('monthlyAnalysis', job);
    logger.info('Monthly analysis scheduled for first day of month at 3:00 AM UTC');
  }

  // Perform health check
  async performHealthCheck() {
    const healthStatus = {
      isHealthy: true,
      issues: [],
      criticalIssues: 0,
      timestamp: new Date()
    };

    try {
      // Check database connection
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        healthStatus.isHealthy = false;
        healthStatus.issues.push('Database connection not ready');
        healthStatus.criticalIssues++;
      }

      // Check OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        healthStatus.isHealthy = false;
        healthStatus.issues.push('OpenAI API key not configured');
        healthStatus.criticalIssues++;
      }

      // Check email configuration
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        healthStatus.isHealthy = false;
        healthStatus.issues.push('Email configuration incomplete');
        healthStatus.criticalIssues++;
      }

      // Check recent activity logs
      const ActivityLog = require('../models/ActivityLog');
      const recentLogs = await ActivityLog.countDocuments({
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      if (recentLogs === 0) {
        healthStatus.issues.push('No recent activity logs in last 24 hours');
        // This is a warning, not critical
      }

      // Check blocked users count
      const User = require('../models/User');
      const blockedUsers = await User.countDocuments({ isBlocked: true });
      
      if (blockedUsers > 10) {
        healthStatus.issues.push(`High number of blocked users: ${blockedUsers}`);
        // This is a warning, not critical
      }

    } catch (error) {
      healthStatus.isHealthy = false;
      healthStatus.issues.push(`Health check error: ${error.message}`);
      healthStatus.criticalIssues++;
    }

    return healthStatus;
  }

  // Perform monthly analysis
  async performMonthlyAnalysis() {
    try {
      const User = require('../models/User');
      const users = await User.find({ isBlocked: false });
      const analysisResults = [];
      const highRiskUsers = [];

      // Analyze last 30 days of data
      for (const user of users) {
        const analysis = await aiThreatDetector.analyzeUserBehavior(user._id, 30);
        analysisResults.push({
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          analysis
        });

        if (analysis.riskScore >= 0.7) {
          highRiskUsers.push({
            user,
            analysis,
            action: analysis.riskScore >= 0.8 ? 'block' : 'monitor'
          });
        }
      }

      // Analyze trends
      const trends = await this.analyzeTrends(analysisResults);

      return { analysisResults, highRiskUsers, trends };
    } catch (error) {
      logger.error('Monthly analysis failed:', error);
      throw error;
    }
  }

  // Analyze trends from monthly data
  async analyzeTrends(analysisResults) {
    const trends = {
      averageRiskScore: 0,
      riskScoreDistribution: { low: 0, medium: 0, high: 0 },
      roleBasedRisk: {},
      timeBasedPatterns: {}
    };

    if (analysisResults.length === 0) return trends;

    // Calculate average risk score
    trends.averageRiskScore = analysisResults.reduce((sum, r) => sum + r.analysis.riskScore, 0) / analysisResults.length;

    // Risk score distribution
    analysisResults.forEach(result => {
      const score = result.analysis.riskScore;
      if (score < 0.4) trends.riskScoreDistribution.low++;
      else if (score < 0.7) trends.riskScoreDistribution.medium++;
      else trends.riskScoreDistribution.high++;
    });

    // Role-based risk analysis
    analysisResults.forEach(result => {
      const role = result.user.role;
      if (!trends.roleBasedRisk[role]) {
        trends.roleBasedRisk[role] = { count: 0, totalScore: 0, averageScore: 0 };
      }
      trends.roleBasedRisk[role].count++;
      trends.roleBasedRisk[role].totalScore += result.analysis.riskScore;
    });

    // Calculate average scores per role
    Object.keys(trends.roleBasedRisk).forEach(role => {
      const roleData = trends.roleBasedRisk[role];
      roleData.averageScore = roleData.totalScore / roleData.count;
    });

    return trends;
  }

  // Generate monthly report
  async generateMonthlyReport(analysisData) {
    try {
      const { sendWeeklySummary } = require('../utils/emailService');
      
      const reportData = {
        totalSuspicious: analysisData.highRiskUsers.length,
        usersWithViolations: analysisData.highRiskUsers.length,
        blockedUsers: analysisData.highRiskUsers.filter(u => u.action === 'block').length,
        monitoredUsers: analysisData.highRiskUsers.filter(u => u.action === 'monitor').length,
        period: `Monthly AI Analysis - Last 30 days (${new Date().toLocaleDateString()})`,
        userViolations: analysisData.highRiskUsers.map(item => ({
          name: item.user.name,
          email: item.user.email,
          role: item.user.role,
          violationCount: 1,
          avgRiskScore: item.analysis.riskScore,
          action: item.action,
          analysis: item.analysis.analysis
        })),
        trends: analysisData.trends
      };

      await sendWeeklySummary(reportData);
      logger.info('Monthly report generated and sent successfully');
      
    } catch (error) {
      logger.error('Failed to generate monthly report:', error);
    }
  }

  // Manually trigger weekly analysis
  async triggerWeeklyAnalysis() {
    try {
      logger.info('Manually triggering weekly analysis...');
      const result = await aiThreatDetector.performWeeklyAnalysis();
      logger.info('Manual weekly analysis completed successfully');
      return result;
    } catch (error) {
      logger.error('Manual weekly analysis failed:', error);
      throw error;
    }
  }

  // Manually trigger health check
  async triggerHealthCheck() {
    try {
      logger.info('Manually triggering health check...');
      const result = await this.performHealthCheck();
      logger.info('Manual health check completed');
      return result;
    } catch (error) {
      logger.error('Manual health check failed:', error);
      throw error;
    }
  }

  // Stop all scheduled jobs
  stopAll() {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped scheduled job: ${name}`);
    });
    this.jobs.clear();
    this.isInitialized = false;
    logger.info('All scheduled jobs stopped');
  }

  // Get status of all jobs
  getStatus() {
    const status = {
      isInitialized: this.isInitialized,
      jobs: {}
    };

    this.jobs.forEach((job, name) => {
      status.jobs[name] = {
        running: job.running,
        nextRun: job.nextDate()
      };
    });

    return status;
  }
}

module.exports = new Scheduler();
