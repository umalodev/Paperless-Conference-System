const express = require('express');
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
  testWebSocket
} = require('../controllers/meetingController');
const { authenticateToken } = require('../middleware/auth');

// Create a new meeting (host/admin only)
router.post('/create', authenticateToken, createMeeting);

// Start meeting (host must actively start)
router.post('/start', authenticateToken, startMeeting);

// Get meetings by current user
router.get('/my-meetings', authenticateToken, getMeetingsByUser);

// Get scheduled meetings by current user
router.get('/scheduled', authenticateToken, getScheduledMeetings);

// Get all meetings (admin only)
router.get('/all', authenticateToken, getAllMeetings);

// Join meeting
router.post('/join', authenticateToken, joinMeeting);

// Get meeting participants
router.get('/:meetingId/participants', authenticateToken, getMeetingParticipants);

// Check meeting status (for participants to validate before joining)
router.get('/:meetingId/status', authenticateToken, checkMeetingStatusForJoin);

// Public meeting status check (no auth required)
router.get('/:meetingId/public-status', getPublicMeetingStatus);

// Get active meetings for participants to join (no auth required)
router.get('/active/public', getPublicActiveMeetings);

// Debug endpoint to check meeting participants in detail
router.get('/:meetingId/debug', authenticateToken, debugMeeting);

// Leave meeting
router.post('/leave', authenticateToken, leaveMeeting);

// End meeting (host/admin only)
router.post('/end', authenticateToken, endMeeting);

// Check meeting status for participant (for polling/auto-exit)
router.get('/:meetingId/status', authenticateToken, checkMeetingStatus);

// Auto-invite all participants to a meeting (host/admin only)
router.post('/auto-invite', authenticateToken, autoInviteParticipants);

// Auto-join meeting for invited participants
router.post('/auto-join', authenticateToken, autoJoinMeeting);

// Get active meetings
router.get('/active', authenticateToken, getActiveMeetings);

// Test WebSocket connection
router.get('/:meetingId/websocket-test', authenticateToken, testWebSocket);

module.exports = router;
