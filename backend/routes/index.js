const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./auth");
const menuRoutes = require("./menu");
const userRoutes = require("./users");
const agendaRoutes = require("./agenda");
const meetingRoutes = require("./meeting");
const notesRoutes = require("./notes");
const materialsRoutes = require("./materials");
const participantRoutes = require("./participants");
const chatRoutes = require("./chat");
const SurveyRoutes = require("./survey");
const filesRoutes = require("./files");


// Use route modules
router.use("/auth", authRoutes);
router.use("/menu", menuRoutes);
router.use("/users", userRoutes);
router.use("/agendas", agendaRoutes);
router.use("/meeting", meetingRoutes);
router.use("/surveys", SurveyRoutes);
router.use("/notes", notesRoutes);
router.use("/materials", materialsRoutes);
router.use("/participants", participantRoutes);
router.use("/chat", chatRoutes);

router.use("/files", filesRoutes);


// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Backend is running!",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
