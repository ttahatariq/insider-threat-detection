const ActivityLog = require("../models/ActivityLog");

const evaluateRisk = async (userId, currentIp) => {
  const logs = await ActivityLog.find({ userId }).sort({ timestamp: -1 });
  if (logs.length === 0) return { score: 0, suspicious: false, reasons: [] };

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const reasons = [];
  let score = 0;

  // 1. Odd hour access (outside 8am–8pm)
  const hour = now.getHours();
  if (hour < 8 || hour > 20) {
    score += 5;
    reasons.push("Accessed system during odd hours");
  }

  // 2. High activity in last hour
  const recentActivity = logs.filter((log) => log.timestamp > oneHourAgo);
  if (recentActivity.length > 5) {
    score += 5;
    reasons.push("High activity within 1 hour");
  }

  // 3. New IP address
  const knownIps = [...new Set(logs.map((log) => log.ipAddress))];
  if (!knownIps.includes(currentIp)) {
    score += 3;
    reasons.push("Access from unknown IP");
  }

  // 4. High download frequency
  const downloads = recentActivity.filter((log) =>
    log.action.includes("Download")
  );
  if (downloads.length > 3) {
    score += 7;
    reasons.push("Frequent file downloads");
  }

  return {
    score,
    suspicious: score >= 10,
    reasons,
  };
};

module.exports = evaluateRisk;
