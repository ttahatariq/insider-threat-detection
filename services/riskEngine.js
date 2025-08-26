const ActivityLog = require("../models/ActivityLog");

const evaluateRisk = async (userId, currentIp) => {
  const logs = await ActivityLog.find({ userId }).sort({ timestamp: -1 });
  if (logs.length === 0) return { score: 0, suspicious: false, reasons: [] };

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const reasons = [];
  let score = 0;

  // 1. Odd hour access (outside 6am–10pm) - More lenient hours
  const hour = now.getHours();
  if (hour < 6 || hour > 22) {
    score += 2; // Reduced from 5 to 2
    reasons.push("Accessed system during very late hours");
  }

  // 2. High activity in last hour - More lenient threshold
  const recentActivity = logs.filter((log) => log.timestamp > oneHourAgo);
  if (recentActivity.length > 10) { // Increased from 5 to 10
    score += 3; // Reduced from 5 to 3
    reasons.push("Very high activity within 1 hour");
  }

  // 3. New IP address - Only if user has many previous IPs
  const knownIps = [...new Set(logs.map((log) => log.ipAddress))];
  if (!knownIps.includes(currentIp) && knownIps.length > 3) {
    score += 1; // Reduced from 3 to 1, only if user has history
    reasons.push("Access from new IP address");
  }

  // 4. High download frequency - Progressive scoring
  const downloads = recentActivity.filter((log) =>
    log.action.includes("Download")
  );
  if (downloads.length > 10) { // Very high threshold
    score += 8; // High penalty for excessive downloads
    reasons.push("Excessive download frequency");
  } else if (downloads.length > 5) { // Moderate threshold
    score += 5; // Moderate penalty
    reasons.push("High download frequency");
  } else if (downloads.length > 3) { // Lower threshold
    score += 3; // Lower penalty
    reasons.push("Moderate download frequency");
  }

  // 5. Suspicious action patterns
  const suspiciousActions = recentActivity.filter((log) =>
    log.action.includes("Failed Login") || 
    log.action.includes("Unauthorized Access") ||
    log.action.includes("Suspicious")
  );
  if (suspiciousActions.length > 0) {
    score += 5;
    reasons.push("Suspicious actions detected");
  }

  // 6. Excessive downloads - Immediate high risk
  if (downloads.length > 20) { // Very excessive
    score += 15; // Immediate high risk
    reasons.push("CRITICAL: Excessive downloads detected");
  } else if (downloads.length > 15) { // Excessive
    score += 12; // High risk
    reasons.push("CRITICAL: Very high download frequency");
  }

  return {
    score,
    suspicious: score >= 12, // Adjusted threshold - more reasonable
    reasons,
  };
};

module.exports = evaluateRisk;
