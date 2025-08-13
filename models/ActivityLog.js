const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  role: String,
  action: String,
  ipAddress: String,
  timestamp: { type: Date, default: Date.now },
  additionalData: {
    riskScore: { type: Number, default: 0 },
    details: String,
    workHours: Boolean,
    downloadCount: Number,
    limit: Number
  }
});

module.exports = mongoose.model("ActivityLog", activityLogSchema);
