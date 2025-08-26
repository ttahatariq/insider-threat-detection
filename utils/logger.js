const ActivityLog = require("../models/ActivityLog");

// Enhanced logger utility with multiple logging levels
const logger = {
  info: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[INFO] ${timestamp}: ${message}`, data);
  },
  
  warn: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(`[WARN] ${timestamp}: ${message}`, data);
  },
  
  error: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR] ${timestamp}: ${message}`, data);
  },
  
  debug: (message, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.log(`[DEBUG] ${timestamp}: ${message}`, data);
    }
  }
};

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
    logger.error("Logging error:", error);
  }
};

module.exports = { logActivity, logger };
