const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { sendAdminAlert } = require('../utils/emailService');

class BehaviorMonitor {
  constructor() {
    this.workHours = {
      start: 9, // 9 AM
      end: 17   // 5 PM
    };
    this.downloadLimits = {
      Manager: 10,    // 10 downloads per day during work hours
      Analyst: 8,     // 8 downloads per day during work hours
      Intern: 5       // 5 downloads per day during work hours
    };
    this.blockingThresholds = {
      Manager: 0.8,   // Block after 80% risk
      Analyst: 0.8,   // Block after 80% risk
      Intern: 1.5     // Block after 150% risk
    };
    this.weeklyViolationLimit = 3; // Block after 3 similar violations in a week
  }

  // Check if current time is within work hours
  isWorkHours() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    // Monday to Friday (1-5), 9 AM to 5 PM
    return dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= this.workHours.start && hour < this.workHours.end;
  }

  // Get download count for user during work hours today
  async getWorkHoursDownloadCount(userId, role) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const downloads = await ActivityLog.countDocuments({
      userId,
      action: { $regex: /download/i },
      timestamp: { $gte: today }
    });

    return downloads;
  }

  // Check if user exceeds download limit during work hours
  async checkDownloadLimit(userId, role) {
    if (!this.isWorkHours()) {
      return { exceeded: false, current: 0, limit: 0 };
    }

    const currentCount = await this.getWorkHoursDownloadCount(userId, role);
    const limit = this.downloadLimits[role] || 5;
    
    return {
      exceeded: currentCount >= limit,
      current: currentCount,
      limit: limit
    };
  }

  // Get weekly violation count for user
  async getWeeklyViolationCount(userId) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const violations = await ActivityLog.countDocuments({
      userId,
      action: { $regex: /download|access|modify/i },
      'additionalData.riskScore': { $gt: 0.7 },
      timestamp: { $gte: oneWeekAgo }
    });

    return violations;
  }

  // Check if user should be blocked based on weekly violations
  async shouldBlockForWeeklyViolations(userId, role) {
    if (role === 'Admin') return false; // Admin cannot be blocked
    
    const violationCount = await this.getWeeklyViolationCount(userId);
    return violationCount >= this.weeklyViolationLimit;
  }

  // Check if user should be blocked based on risk score
  shouldBlockForRiskScore(role, riskScore) {
    if (role === 'Admin') return false; // Admin cannot be blocked
    
    const threshold = this.blockingThresholds[role] || 1.0;
    return riskScore >= threshold;
  }

  // Evaluate behavior and determine action
  async evaluateBehavior(user, action, riskScore, details = {}) {
    const result = {
      shouldBlock: false,
      shouldNotify: false,
      reason: '',
      action: 'monitor'
    };

    // Check download limits during work hours
    if (action.toLowerCase().includes('download')) {
      const downloadCheck = await this.checkDownloadLimit(user._id, user.role);
      
      if (downloadCheck.exceeded) {
        result.shouldNotify = true;
        result.reason = `Download limit exceeded during work hours. Current: ${downloadCheck.current}, Limit: ${downloadCheck.limit}`;
        
        // Send email to admin
        await sendAdminAlert(
          user, 
          'Download Limit Exceeded', 
          riskScore, 
          `User exceeded daily download limit during work hours. Current: ${downloadCheck.current}, Limit: ${downloadCheck.limit}`
        );
      }
    }

    // Check weekly violations
    const weeklyViolations = await this.shouldBlockForWeeklyViolations(user._id, user.role);
    if (weeklyViolations) {
      result.shouldBlock = true;
      result.reason = 'Weekly violation limit exceeded (3+ suspicious activities)';
      result.action = 'block';
      
      // Send email to admin
      await sendAdminAlert(
        user, 
        'Weekly Violation Limit Exceeded', 
        riskScore, 
        'User has exceeded weekly violation limit and will be blocked'
      );
    }

    // Check risk score threshold
    if (this.shouldBlockForRiskScore(user.role, riskScore)) {
      result.shouldBlock = true;
      result.reason = `Risk score ${(riskScore * 100).toFixed(1)}% exceeds blocking threshold for role ${user.role}`;
      result.action = 'block';
      
      // Send email to admin
      await sendAdminAlert(
        user, 
        'High Risk Score - User Blocked', 
        riskScore, 
        `User blocked due to high risk score: ${(riskScore * 100).toFixed(1)}%`
      );
    }

    // Always notify admin for high risk activities
    if (riskScore > 0.7) {
      result.shouldNotify = true;
      if (!result.reason) {
        result.reason = `High risk activity detected: ${(riskScore * 100).toFixed(1)}%`;
      }
      
      // Send email to admin
      await sendAdminAlert(
        user, 
        'High Risk Activity Detected', 
        riskScore, 
        details
      );
    }

    return result;
  }

  // Apply behavior consequences
  async applyConsequences(user, evaluation) {
    if (evaluation.shouldBlock) {
      user.isBlocked = true;
      user.blockedAt = new Date();
      user.riskNotes.push({
        reason: evaluation.reason,
        timestamp: new Date(),
        action: evaluation.action
      });
      
      await user.save();
      console.log(`User ${user.email} blocked: ${evaluation.reason}`);
    } else if (evaluation.shouldNotify) {
      // Add risk note for monitoring
      user.riskNotes.push({
        reason: evaluation.reason,
        timestamp: new Date(),
        action: 'monitor'
      });
      
      await user.save();
      console.log(`User ${user.email} flagged for monitoring: ${evaluation.reason}`);
    }
  }

  // Get behavior summary for admin
  async getBehaviorSummary() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // Get suspicious activities
    const suspiciousActivities = await ActivityLog.countDocuments({
      'additionalData.riskScore': { $gt: 0.7 },
      timestamp: { $gte: oneWeekAgo }
    });

    // Get users with multiple violations
    const userViolations = await ActivityLog.aggregate([
      {
        $match: {
          'additionalData.riskScore': { $gt: 0.7 },
          timestamp: { $gte: oneWeekAgo }
        }
      },
      {
        $group: {
          _id: '$userId',
          violationCount: { $sum: 1 },
          avgRiskScore: { $avg: '$additionalData.riskScore' }
        }
      },
      {
        $match: { violationCount: { $gte: 2 } }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $project: {
          name: '$userInfo.name',
          email: '$userInfo.email',
          role: '$userInfo.role',
          violationCount: 1,
          avgRiskScore: 1
        }
      }
    ]);

    // Get blocked users count
    const blockedUsers = await User.countDocuments({ isBlocked: true });

    return {
      totalSuspicious: suspiciousActivities,
      usersWithViolations: userViolations.length,
      blockedUsers,
      period: `Last 7 days (${oneWeekAgo.toLocaleDateString()} - ${new Date().toLocaleDateString()})`,
      userViolations
    };
  }
}

module.exports = new BehaviorMonitor();
