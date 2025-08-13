const evaluateRisk = require("../services/riskEngine");
const logActivity = require("../utils/logger");
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
router.get("/view-reports", protect(["Admin", "Manager"]), async (req, res) => {
  await logActivity(req.user, "Viewed Reports", req.ip);
  res.json({ message: `${req.user.role} can view reports.` });
});

router.get(
  "/download-files",
  protect(["Admin", "Analyst"]),
  async (req, res) => {
    await logActivity(req.user, "Downloaded Files", req.ip);

    const risk = await evaluateRisk(req.user.id, req.ip);

    if (risk.suspicious) {
      // Block user in DB
      req.user.isBlocked = true;
      req.user.blockedAt = new Date();
      req.user.riskNotes = risk.reasons;
      await req.user.save();

      return res.status(403).json({
        message: "You have been blocked due to suspicious behavior",
        riskScore: risk.score,
        reasons: risk.reasons,
      });
    }

    res.json({
      message: `${req.user.role} downloaded files`,
      riskScore: risk.score,
    });
  }
);

router.get("/manage-users", protect(["Admin"]), async (req, res) => {
  await logActivity(req.user, "Managed Users", req.ip);
  res.json({ message: `${req.user.role} can manage users.` });
});

// Get All Users (Admin only)
router.get("/all-users", protect(["Admin"]), async (req, res) => {
  const users = await require("../models/User")
    .find()
    .select("-password")
    .sort({ createdAt: -1 });
  res.json(users);
});

// Get Activity Logs for a User
router.get("/logs/:userId", protect(["Admin"]), async (req, res) => {
  const logs = await require("../models/ActivityLog")
    .find({ userId: req.params.userId })
    .sort({ timestamp: -1 });
  res.json(logs);
});

//Get Suspicious Users (Blocked Only)
router.get("/flagged-users", protect(["Admin"]), async (req, res) => {
  const users = await require("../models/User")
    .find({ isBlocked: true })
    .select("-password");
  res.json(users);
});

//Route to unblock a user
router.post("/unblock/:userId", protect(["Admin"]), async (req, res) => {
  const user = await require("../models/User").findById(req.params.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.isBlocked = false;
  user.blockedAt = null;
  user.riskNotes = [];
  await user.save();

  res.json({ message: "User has been unblocked" });
});

//For Debugging: Log all activity
router.get("/logs", protect(["Admin"]), async (req, res) => {
  const logs = await require("../models/ActivityLog")
    .find()
    .sort({ timestamp: -1 });
  res.json(logs);
});

module.exports = router;
