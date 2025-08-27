const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./auth");
const menuRoutes = require("./menu");
const userRoutes = require("./users");
const agendaRoutes = require("./agenda");
const meetingRoutes = require("./meeting");
const notesRoutes = require("./notes");

// Use route modules
router.use("/auth", authRoutes);
router.use("/menu", menuRoutes);
router.use("/users", userRoutes);
router.use("/agendas", agendaRoutes);
router.use("/meeting", meetingRoutes);
router.use("/notes", notesRoutes);

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Backend is running!",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
