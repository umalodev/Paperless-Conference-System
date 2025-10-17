const express = require("express");
const router = express.Router();
const {
  createMeeting,
  startMeeting,
  getMeetingsByUser,
  getAllMeetings,
  joinMeeting,
  getMeetingParticipants,
  leaveMeeting,
  endMeeting,
  getActiveMeetings,
  autoInviteParticipants,
  autoJoinMeeting,
  checkMeetingStatus,
  getScheduledMeetings,
  checkMeetingStatusForJoin,
  getPublicMeetingStatus,
  getPublicActiveMeetings,
  debugMeeting,
  testWebSocket,
  getDefaultMeeting,
  joinDefaultMeeting,
  hostSmartEnter,
} = require("../controllers/meetingController");
const auth = require("../middleware/auth");

router.get("/default", auth.isAuthenticated, getDefaultMeeting);
router.post("/default/join", auth.isAuthenticated, joinDefaultMeeting);

// Create a new meeting (host/admin only)
router.post("/create", auth.isAuthenticated, createMeeting);

// Start meeting (host must actively start)
router.post("/start", auth.isAuthenticated, startMeeting);

// Get meetings by current user
router.get("/my-meetings", auth.isAuthenticated, getMeetingsByUser);

// Get scheduled meetings by current user
router.get("/scheduled", auth.isAuthenticated, getScheduledMeetings);

// Get all meetings (admin only)
router.get("/all", auth.isAuthenticated, getAllMeetings);

// Join meeting
router.post("/join", auth.isAuthenticated, joinMeeting);

// Get meeting participants
router.get(
  "/:meetingId/participants",
  auth.isAuthenticated,
  getMeetingParticipants
);

// Check meeting status (for participants to validate before joining)
router.get(
  "/:meetingId/status-for-join",
  auth.isAuthenticated,
  checkMeetingStatusForJoin
);

// Public meeting status check (no auth required)
router.get("/:meetingId/public-status", getPublicMeetingStatus);

// Get active meetings for participants to join (no auth required)
router.get("/active/public", getPublicActiveMeetings);

// Debug endpoint to check meeting participants in detail
router.get("/:meetingId/debug", auth.isAuthenticated, debugMeeting);

// Leave meeting
router.post("/leave", auth.isAuthenticated, leaveMeeting);

// End meeting (host/admin only)
router.post("/end", auth.isAuthenticated, endMeeting);

// Check meeting status for participant (for polling/auto-exit)
router.get("/:meetingId/status", auth.isAuthenticated, checkMeetingStatus);

// Auto-invite all participants to a meeting (host/admin only)
router.post("/auto-invite", auth.isAuthenticated, autoInviteParticipants);

// Auto-join meeting for invited participants
router.post("/auto-join", auth.isAuthenticated, autoJoinMeeting);

router.post("/host-smart-enter", auth.isAuthenticated, hostSmartEnter);

// Get active meetings
router.get("/active", auth.isAuthenticated, getActiveMeetings);

// Test WebSocket connection
router.get("/:meetingId/websocket-test", auth.isAuthenticated, testWebSocket);

module.exports = router;
