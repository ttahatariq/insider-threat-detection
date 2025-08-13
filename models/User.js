const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: {
    type: String,
    enum: ["Admin", "Manager", "Analyst", "Intern"],
    default: "Intern",
  },
  isBlocked: { type: Boolean, default: false },
  blockedAt: Date,
  riskNotes: [String],

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
