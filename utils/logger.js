const ActivityLog = require("../models/ActivityLog");

const logActivity = async (user, action, ip, additionalData = {}) => {
  try {
    await ActivityLog.create({
      userId: user.id,
      role: user.role,
      action,
      ipAddress: ip,
      additionalData: {
        riskScore: additionalData.riskScore || 0,
        details: additionalData.details || '',
        workHours: additionalData.workHours || false,
        downloadCount: additionalData.downloadCount || 0,
        limit: additionalData.limit || 0
      }
    });
  } catch (error) {
    console.error("Logging error:", error);
  }
};

module.exports = logActivity;
