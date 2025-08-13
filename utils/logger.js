const ActivityLog = require("../models/ActivityLog");

const logActivity = async (user, action, ip) => {
  try {
    await ActivityLog.create({
      userId: user.id,
      role: user.role,
      action,
      ipAddress: ip,
    });
  } catch (error) {
    console.error("Logging error:", error);
  }
};

module.exports = logActivity;
