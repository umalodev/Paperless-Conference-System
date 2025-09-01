const express = require('express');
const router = express.Router();
const participantController = require('../controllers/participantController');
const { isAuthenticated } = require('../middleware/auth');

// Test endpoint without auth - must be before middleware
router.get('/test', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Participant route is working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in test endpoint',
      error: error.message
    });
  }
});

// Test participants endpoint - return dummy data (no auth required)
router.get('/test-data', participantController.getTestParticipants);

// Get participants with status "joined" from database (no auth required for now)
router.get('/joined', participantController.getJoinedParticipants);

// Debug endpoint - get basic info (no auth required for debugging)
router.get('/debug', participantController.getBasicInfo);

// Apply auth middleware to all other routes
router.use(isAuthenticated);

// Get participants for a specific meeting
router.get('/meeting/:meetingId', participantController.getMeetingParticipants);

// Get participants for current user's active meeting
router.get('/my-meeting', participantController.getMyMeetingParticipants);

// Add participant to a meeting
router.post('/add', participantController.addParticipantToMeeting);

// Update participant status (mic, camera, etc.)
router.put('/:participantId/status', participantController.updateParticipantStatus);

module.exports = router;
