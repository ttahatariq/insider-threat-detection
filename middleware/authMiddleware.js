const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = (roles = []) => {
  return async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.isBlocked)
        return res.status(403).json({ message: "User is blocked" });

      req.user = user;
      if (roles.length && !roles.includes(user.role)) {
        return res
          .status(403)
          .json({ message: "Forbidden: Insufficient role" });
      }

      next();
    } catch (err) {
      res.status(401).json({ message: "Invalid token" });
    }
  };
};

module.exports = { protect };
