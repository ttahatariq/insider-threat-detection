const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("DB connection error:", err));

// Initialize scheduler
const scheduler = require('./services/scheduler');

// Routes will go here
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/ai-analysis", require("./routes/aiAnalysisRoutes"));

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize scheduler after server starts
  try {
    scheduler.initialize();
    console.log('AI Threat Detection Scheduler initialized successfully');
  } catch (error) {
    console.error('Failed to initialize AI Threat Detection Scheduler:', error);
  }
});

app.get("/", (req, res) => {
  res.send("Server is up and running ✅");
});
