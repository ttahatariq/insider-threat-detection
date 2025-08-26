const evaluateRisk = require("../services/riskEngine");
const behaviorMonitor = require("../services/behaviorMonitor");
const { logActivity } = require("../utils/logger");
const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getProfile,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

// ⛏️ DEBUG LINE — log before register
router.post(
  "/register",
  (req, res, next) => {
    console.log("🔥 /register route hit!");
    next();
  },
  register
);

router.post("/login", login);
router.get("/profile", protect(), getProfile);

// Get All Users (Admin can see all, Manager can see their team, Analyst/Intern can see basic info)
router.get("/all-users", protect(["Admin", "Manager", "Analyst", "Intern"]), async (req, res) => {
  try {
    let users;
    
    if (req.user.role === "Admin") {
      // Admin sees all users
      users = await require("../models/User")
        .find()
        .select("-password")
        .sort({ createdAt: -1 });
    } else if (req.user.role === "Manager") {
      // Manager sees their team members (Analyst, Intern)
      users = await require("../models/User")
        .find({ role: { $in: ["Analyst", "Intern"] } })
        .select("-password")
        .sort({ createdAt: -1 });
    } else if (req.user.role === "Analyst" || req.user.role === "Intern") {
      // Analyst and Intern see basic user info (no sensitive data)
      users = await require("../models/User")
        .find()
        .select("name email role isBlocked createdAt")
        .sort({ createdAt: -1 });
    }
    
    await logActivity(req.user, "Viewed Users List", req.ip);
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Get Activity Logs for a User (Admin sees all, Manager sees team, Analyst/Intern see own)
router.get("/logs/:userId", protect(["Admin", "Manager", "Analyst", "Intern"]), async (req, res) => {
  try {
    let logs;
    const targetUserId = req.params.userId;
    
    if (req.user.role === "Admin") {
      // Admin can see all logs
      logs = await require("../models/ActivityLog")
        .find({ userId: targetUserId })
        .populate('userId', 'name email role')
        .sort({ timestamp: -1 });
    } else if (req.user.role === "Manager") {
      // Manager can see logs of team members
      const targetUser = await require("../models/User").findById(targetUserId);
      if (!targetUser || !["Analyst", "Intern"].includes(targetUser.role)) {
        return res.status(403).json({ message: "You can only view logs of your team members" });
      }
      logs = await require("../models/ActivityLog")
        .find({ userId: targetUserId })
        .populate('userId', 'name email role')
        .sort({ timestamp: -1 });
    } else if (req.user.role === "Analyst" || req.user.role === "Intern") {
      // Analyst and Intern can only see their own logs
      if (targetUserId !== req.user.id) {
        return res.status(403).json({ message: "You can only view your own logs" });
      }
      logs = await require("../models/ActivityLog")
        .find({ userId: req.user.id })
        .populate('userId', 'name email role')
        .sort({ timestamp: -1 });
    }
    
    await logActivity(req.user, `Viewed Logs for User ${targetUserId}`, req.ip);
    res.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ message: "Failed to fetch logs" });
  }
});

// Get All Logs (Admin sees all, Manager sees team logs, Analyst/Intern see own logs)
router.get("/all-logs", protect(["Admin", "Manager", "Analyst", "Intern"]), async (req, res) => {
  try {
    let logs;
    
    if (req.user.role === "Admin") {
      // Admin sees all logs from all users
      logs = await require("../models/ActivityLog")
        .find()
        .populate('userId', 'name email role')
        .sort({ timestamp: -1 });
    } else if (req.user.role === "Manager") {
      // Manager sees logs from team members
      const teamUsers = await require("../models/User")
        .find({ role: { $in: ["Analyst", "Intern"] } })
        .select("_id");
      const teamUserIds = teamUsers.map(user => user._id);
      logs = await require("../models/ActivityLog")
        .find({ userId: { $in: teamUserIds } })
        .populate('userId', 'name email role')
        .sort({ timestamp: -1 });
    } else if (req.user.role === "Analyst" || req.user.role === "Intern") {
      // Analyst and Intern see only their own logs
      logs = await require("../models/ActivityLog")
        .find({ userId: req.user.id })
        .populate('userId', 'name email role')
        .sort({ timestamp: -1 });
    }
    
    await logActivity(req.user, "Viewed All Logs", req.ip);
    res.json(logs);
  } catch (error) {
    console.error("Error fetching all logs:", error);
    res.status(500).json({ message: "Failed to fetch logs" });
  }
});

// Get Own Logs (any authenticated user)
router.get("/my-logs", protect(), async (req, res) => {
  try {
    const logs = await require("../models/ActivityLog")
      .find({ userId: req.user.id })
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 });
    
    await logActivity(req.user, "Viewed Own Logs", req.ip);
    res.json(logs);
  } catch (error) {
    console.error("Error fetching own logs:", error);
    res.status(500).json({ message: "Failed to fetch logs" });
  }
});

// Get Flagged Users (Admin sees all, Manager sees team, Analyst/Intern see basic info)
router.get("/flagged-users", protect(["Admin", "Manager", "Analyst", "Intern"]), async (req, res) => {
  try {
    let users;
    
    if (req.user.role === "Admin") {
      // Admin sees all flagged users
      users = await require("../models/User")
        .find({ isBlocked: true })
        .select("-password");
    } else if (req.user.role === "Manager") {
      // Manager sees flagged team members
      users = await require("../models/User")
        .find({ isBlocked: true, role: { $in: ["Analyst", "Intern"] } })
        .select("-password");
    } else if (req.user.role === "Analyst" || req.user.role === "Intern") {
      // Analyst and Intern see basic info of flagged users
      users = await require("../models/User")
        .find({ isBlocked: true })
        .select("name email role isBlocked createdAt");
    }
    
    // Debug: Log what's being sent to frontend
    console.log('Flagged users being sent:', users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      riskNotes: user.riskNotes
    })));
    
    await logActivity(req.user, "Viewed Flagged Users", req.ip);
    res.json(users);
  } catch (error) {
    console.error("Error fetching flagged users:", error);
    res.status(500).json({ message: "Failed to fetch flagged users" });
  }
});

// Route to unblock a user (Admin and Manager can unblock team members)
router.post("/unblock/:userId", protect(["Admin", "Manager"]), async (req, res) => {
  try {
    const user = await require("../models/User").findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if Manager can unblock this user
    if (req.user.role === "Manager" && !["Analyst", "Intern"].includes(user.role)) {
      return res.status(403).json({ message: "You can only unblock your team members" });
    }

    user.isBlocked = false;
    user.blockedAt = null;
    user.riskNotes = [];
    await user.save();

    await logActivity(req.user, `Unblocked User ${user.name}`, req.ip);
    res.json({ message: "User has been unblocked" });
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.status(500).json({ message: "Failed to unblock user" });
  }
});

// View Reports (Admin, Manager, Analyst)
router.get("/view-reports", protect(["Admin", "Manager", "Analyst"]), async (req, res) => {
  await logActivity(req.user, "Viewed Reports", req.ip);
  res.json({ message: `${req.user.role} can view reports.` });
});

// Download Files (Admin, Manager, Analyst, Intern)
router.get("/download-files", protect(["Admin", "Manager", "Analyst", "Intern"]), async (req, res) => {
  try {
    // Check if user is already blocked
    if (req.user.isBlocked) {
      // Convert riskNotes to readable format
      const readableReasons = req.user.riskNotes.map(note => 
        typeof note === 'string' ? note : note.reason
      );
      
      console.log('User blocked, riskNotes:', req.user.riskNotes);
      console.log('Readable reasons:', readableReasons);
      
      return res.status(403).json({
        message: "Your account has been blocked due to suspicious behavior",
        blockedAt: req.user.blockedAt,
        reasons: readableReasons
      });
    }

    // Check download limits during work hours
    const downloadCheck = await behaviorMonitor.checkDownloadLimit(req.user._id, req.user.role);
    
    // Log the download attempt for monitoring
    await logActivity(req.user, "Download Attempt", req.ip, {
      riskScore: 0.1, // Low risk for attempt
      details: `Download attempt. Current: ${downloadCheck.current}, Limit: ${downloadCheck.limit}`
    });
    
    if (downloadCheck.isExcessive) {
      // Excessive downloads - immediate blocking
      await logActivity(req.user, "CRITICAL: Excessive Downloads - Blocked", req.ip, {
        riskScore: 1.0, // Maximum risk
        details: `User blocked for excessive downloads. Current: ${downloadCheck.current}, Limit: ${downloadCheck.limit}`
      });

      return res.status(403).json({
        message: "Your account has been blocked for excessive downloads",
        current: downloadCheck.current,
        limit: downloadCheck.limit,
        reason: "Excessive download activity detected"
      });
    } else if (downloadCheck.isModeratelyExceeded) {
      // Moderately exceeded - warning
      await logActivity(req.user, "High Download Activity Warning", req.ip, {
        riskScore: 0.7,
        details: `High download activity. Current: ${downloadCheck.current}, Limit: ${downloadCheck.limit}`
      });

      return res.status(429).json({
        message: "High download activity detected - please reduce frequency",
        current: downloadCheck.current,
        limit: downloadCheck.limit,
        warning: "You are approaching excessive download limits"
      });
    } else if (downloadCheck.exceeded) {
      // Standard limit exceeded
      await logActivity(req.user, "Download Limit Exceeded", req.ip, {
        riskScore: 0.6,
        details: `Download limit exceeded during work hours. Current: ${downloadCheck.current}, Limit: ${downloadCheck.limit}`
      });

      return res.status(429).json({
        message: "Download limit exceeded during work hours",
        current: downloadCheck.current,
        limit: downloadCheck.limit,
        nextReset: "Tomorrow at 9 AM"
      });
    }

    // Evaluate risk
    const risk = await evaluateRisk(req.user.id, req.ip);
    
    // Normalize risk score to 0-1 range (risk.score is 0-20, normalize to 0-1)
    const normalizedRiskScore = Math.min(risk.score / 20, 1);
    
    // Log the download activity
    await logActivity(req.user, "Downloaded Files", req.ip, {
      riskScore: normalizedRiskScore,
      details: `File download with risk score: ${(normalizedRiskScore * 100).toFixed(1)}%`
    });

    // Evaluate behavior using the behavior monitor
    const behaviorEvaluation = await behaviorMonitor.evaluateBehavior(
      req.user, 
      "Download Files", 
      normalizedRiskScore, 
      `File download from IP: ${req.ip}`
    );

    // Apply consequences (blocking, notifications, etc.)
    await behaviorMonitor.applyConsequences(req.user, behaviorEvaluation);

    // Check if user was blocked
    if (behaviorEvaluation.shouldBlock) {
      return res.status(403).json({
        message: "You have been blocked due to suspicious behavior",
        riskScore: normalizedRiskScore,
        reasons: behaviorEvaluation.reason,
        blockedAt: req.user.blockedAt
      });
    }

    // If everything is okay, allow the download
    res.json({
      message: `${req.user.role} downloaded files successfully`,
      riskScore: normalizedRiskScore,
      downloadCount: downloadCheck.current + 1,
      limit: downloadCheck.limit,
      workHours: behaviorMonitor.isWorkHours()
    });

  } catch (error) {
    console.error("Error in download-files:", error);
    res.status(500).json({ message: "Download failed" });
  }
});

// Manage Users (Admin and Manager)
router.get("/manage-users", protect(["Admin", "Manager"]), async (req, res) => {
  await logActivity(req.user, "Managed Users", req.ip);
  res.json({ message: `${req.user.role} can manage users.` });
});

// For Debugging: Log all activity (Admin only)
router.get("/logs", protect(["Admin"]), async (req, res) => {
  const logs = await require("../models/ActivityLog")
    .find()
    .sort({ timestamp: -1 });
  res.json(logs);
});

// Get Total Logs Count for Dashboard Stats (Admin, Manager, Analyst, Intern)
router.get("/total-logs-count", protect(["Admin", "Manager", "Analyst", "Intern"]), async (req, res) => {
  try {
    let totalLogs;
    
    if (req.user.role === "Admin") {
      // Admin sees total count of all logs
      totalLogs = await require("../models/ActivityLog").countDocuments();
    } else if (req.user.role === "Manager") {
      // Manager sees total count of team member logs
      const teamUsers = await require("../models/User")
        .find({ role: { $in: ["Analyst", "Intern"] } })
        .select("_id");
      const teamUserIds = teamUsers.map(user => user._id);
      totalLogs = await require("../models/ActivityLog")
        .countDocuments({ userId: { $in: teamUserIds } });
    } else if (req.user.role === "Analyst" || req.user.role === "Intern") {
      // Analyst and Intern see only their own logs count
      totalLogs = await require("../models/ActivityLog")
        .countDocuments({ userId: req.user.id });
    }
    
    await logActivity(req.user, "Viewed Total Logs Count", req.ip);
    res.json({ totalLogs });
  } catch (error) {
    console.error("Error fetching total logs count:", error);
    res.status(500).json({ message: "Failed to fetch total logs count" });
  }
});

// Get Behavior Summary for Admin
router.get("/behavior-summary", protect(["Admin"]), async (req, res) => {
  try {
    const summary = await behaviorMonitor.getBehaviorSummary();
    
    await logActivity(req.user, "Viewed Behavior Summary", req.ip);
    res.json(summary);
  } catch (error) {
    console.error("Error fetching behavior summary:", error);
    res.status(500).json({ message: "Failed to fetch behavior summary" });
  }
});

// Send Weekly Summary Email to Admin
router.post("/send-weekly-summary", protect(["Admin"]), async (req, res) => {
  try {
    const { sendWeeklySummary } = require("../utils/emailService");
    const summary = await behaviorMonitor.getBehaviorSummary();
    
    const emailSent = await sendWeeklySummary(summary);
    
    await logActivity(req.user, "Sent Weekly Summary Email", req.ip);
    res.json({ 
      message: emailSent ? "Weekly summary email sent successfully" : "Failed to send weekly summary email",
      emailSent,
      summary
    });
  } catch (error) {
    console.error("Error sending weekly summary:", error);
    res.status(500).json({ message: "Failed to send weekly summary" });
  }
});

// Mock user creation for testing (when MongoDB is not available)
router.post("/create-test-user", async (req, res) => {
  try {
    // Create a mock user for testing AI features
    const mockUser = {
      _id: "test-user-123",
      name: "Test User",
      email: "test@example.com",
      role: "Analyst",
      isBlocked: false,
      createdAt: new Date()
    };
    
    // Create mock activity logs for AI analysis
    const mockActivities = [
      {
        userId: mockUser._id,
        action: "download",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        ipAddress: "192.168.1.100",
        additionalData: { riskScore: 0.3, workHours: true }
      },
      {
        userId: mockUser._id,
        action: "access",
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        ipAddress: "192.168.1.100",
        additionalData: { riskScore: 0.2, workHours: true }
      },
      {
        userId: mockUser._id,
        action: "download",
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        ipAddress: "192.168.1.100",
        additionalData: { riskScore: 0.4, workHours: false }
      }
    ];
    
    res.json({
      success: true,
      message: "Test user created successfully",
      user: mockUser,
      activities: mockActivities
    });
  } catch (error) {
    console.error("Error creating test user:", error);
    res.status(500).json({ message: "Failed to create test user" });
  }
});

module.exports = router;
