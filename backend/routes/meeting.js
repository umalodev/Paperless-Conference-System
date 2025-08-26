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
  autoJoinMeeting
} = require('../controllers/meetingController');
const { authenticateToken } = require('../middleware/auth');
const models = require('../models');

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Meeting API is working!',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to check meetings in database
router.get('/test-meetings', async (req, res) => {
  try {
    const models = require('../models');
    const meetings = await models.Meeting.findAll({
      raw: true,
      limit: 5
    });
    
    res.json({
      success: true,
      message: 'Meetings in database',
      count: meetings.length,
      meetings: meetings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking meetings',
      error: error.message
    });
  }
});

// Test endpoint to check active meetings without complex joins
router.get('/test-active', async (req, res) => {
  try {
    const models = require('../models');
    const activeMeetings = await models.Meeting.findAll({
      where: { status: 'active' },
      raw: true,
      limit: 5
    });
    
    res.json({
      success: true,
      message: 'Active meetings found',
      count: activeMeetings.length,
      meetings: activeMeetings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking active meetings',
      error: error.message
    });
  }
});

// Test create meeting without auth (for debugging)
router.post('/test-create', async (req, res) => {
  try {
    console.log('Test create meeting - Request body:', req.body);
    
    const { title, description, startTime, endTime } = req.body;
    
    // Validate required fields
    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Title, start time, and end time are required'
      });
    }

    // Create meeting with hardcoded user ID for testing
    const meeting = await models.Meeting.create({
      title,
      description: description || '',
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      userId: 1, // Hardcoded for testing
      flag: 'Y'
    });

    console.log('Test meeting created successfully:', meeting);

    res.status(201).json({
      success: true,
      message: 'Test meeting created successfully',
      data: {
        meetingId: meeting.meetingId,
        title: meeting.title,
        description: meeting.description,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        userId: meeting.userId
      }
    });

  } catch (error) {
    console.error('Error in test create meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Create a new meeting (host/admin only)
router.post('/create', authenticateToken, createMeeting);

// Start meeting (host must actively start)
router.post('/start', authenticateToken, startMeeting);

// Get meetings by current user
router.get('/my-meetings', authenticateToken, getMeetingsByUser);

// Get all meetings (admin only)
router.get('/all', authenticateToken, getAllMeetings);

// Join meeting
router.post('/join', authenticateToken, joinMeeting);

// Get meeting participants
router.get('/:meetingId/participants', authenticateToken, getMeetingParticipants);

// Check meeting status (for participants to validate before joining)
router.get('/:meetingId/status', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    console.log(`Meeting status check - Meeting ID: ${meetingId}, User ID: ${userId}`);

    // Check if meeting exists
    const meeting = await models.Meeting.findByPk(meetingId);
    if (!meeting) {
      console.log(`Meeting ${meetingId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if meeting is active and started
    const isActive = meeting.status === 'started';
    
    // Check if meeting has host
    const hostParticipant = await models.MeetingParticipant.findOne({
      where: { 
        meetingId, 
        role: 'host', 
        flag: 'Y' 
      }
    });

    const hasHost = !!hostParticipant;
    const hostOnline = hasHost && hostParticipant.status === 'joined';
    
    // Get participant count with detailed logging
    const allParticipants = await models.MeetingParticipant.findAll({
      where: { meetingId, flag: 'Y' },
      include: [{
        model: models.User,
        as: 'User',
        attributes: ['id', 'username']
      }]
    });

    const participantCount = allParticipants.length;
    
    console.log(`Meeting ${meetingId} status:`, {
      meetingId: meeting.meetingId,
      userId: meeting.userId,
      status: meeting.status,
      requestingUserId: userId,
      isActive,
      hasHost,
      hostOnline,
      participantCount,
      participants: allParticipants.map(p => ({
        userId: p.userId,
        role: p.userRole,
        status: p.status,
        username: p.User?.username
      }))
    });

    res.json({
      success: true,
      data: {
        meetingId: meeting.meetingId,
        title: meeting.title,
        status: meeting.status,
        userId: meeting.userId, // Add userId for ownership verification
        isActive,
        hasHost,
        hostOnline,
        participantCount,
        startTime: meeting.startTime,
        endTime: meeting.endTime
      }
    });

  } catch (error) {
    console.error('Error checking meeting status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking meeting status',
      error: error.message
    });
  }
});

// Public meeting status check (no auth required)
router.get('/:meetingId/public-status', async (req, res) => {
  try {
    const { meetingId } = req.params;

    console.log(`Public meeting status check - Meeting ID: ${meetingId}`);

    // Check if meeting exists
    const meeting = await models.Meeting.findByPk(meetingId);
    if (!meeting) {
      console.log(`Meeting ${meetingId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if meeting is active and started
    const isActive = meeting.status === 'started';
    
    // Check if meeting has host
    const hostParticipant = await models.MeetingParticipant.findOne({
      where: { 
        meetingId, 
        role: 'host', 
        flag: 'Y' 
      }
    });

    const hasHost = !!hostParticipant;
    const hostOnline = hasHost && hostParticipant.status === 'joined';
    
    // Get participant count
    const allParticipants = await models.MeetingParticipant.findAll({
      where: { meetingId, flag: 'Y' }
    });

    const participantCount = allParticipants.length;
    
    console.log(`Public meeting ${meetingId} status:`, {
      meetingId: meeting.meetingId,
      status: meeting.status,
      isActive,
      hasHost,
      hostOnline,
      participantCount
    });

    res.json({
      success: true,
      data: {
        meetingId: meeting.meetingId,
        title: meeting.title,
        status: meeting.status,
        isActive,
        hasHost,
        hostOnline,
        participantCount,
        startTime: meeting.startTime,
        endTime: meeting.endTime
      }
    });

  } catch (error) {
    console.error('Error checking public meeting status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking meeting status',
      error: error.message
    });
  }
});

// Get active meetings for participants to join (no auth required)
router.get('/active/public', async (req, res) => {
  try {
    console.log('Getting public active meetings');

    // Find meetings that are started and flagged Y (no include to avoid alias issues)
    const activeMeetings = await models.Meeting.findAll({
      where: { 
        status: 'started',
        flag: 'Y'
      },
      order: [['created_at', 'DESC']],
      limit: 10,
      raw: true
    });

    // For each meeting, verify there is a host participant with flag Y
    const verifiedMeetings = [];
    for (const meeting of activeMeetings) {
      const host = await models.MeetingParticipant.findOne({
        where: {
          meetingId: meeting.meeting_id || meeting.meetingId,
          role: 'host',
          flag: 'Y'
        },
        raw: true
      });
      if (host) {
        verifiedMeetings.push({
          meetingId: meeting.meeting_id || meeting.meetingId,
          title: meeting.title,
          description: meeting.description,
          status: meeting.status,
          startTime: meeting.start_time || meeting.startTime,
          endTime: meeting.end_time || meeting.endTime,
          participantCount: meeting.current_participants || meeting.currentParticipants || 0
        });
      }
    }

    console.log(`Found ${verifiedMeetings.length} active meetings with host`);

    res.json({
      success: true,
      data: verifiedMeetings
    });

  } catch (error) {
    console.error('Error getting public active meetings:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting active meetings',
      error: error.message
    });
  }
});

// Debug endpoint to check meeting participants in detail
router.get('/:meetingId/debug', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    console.log(`Debug meeting ${meetingId} - User ID: ${userId}`);

    // Check if meeting exists
    const meeting = await models.Meeting.findByPk(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Get all participants with detailed info
    const participants = await models.MeetingParticipant.findAll({
      where: { meetingId, flag: 'Y' },
      include: [{
        model: models.User,
        as: 'User',
        attributes: ['id', 'username', 'email']
      }],
      order: [['joinTime', 'ASC']]
    });

    // Get meeting info
    const meetingInfo = {
      meetingId: meeting.meetingId,
      title: meeting.title,
      status: meeting.status,
      currentParticipants: meeting.currentParticipants,
      maxParticipants: meeting.maxParticipants,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      created_at: meeting.created_at,
      updated_at: meeting.updated_at
    };

    console.log(`Debug meeting ${meetingId} results:`, {
      meeting: meetingInfo,
      participants: participants.map(p => ({
        id: p.id,
        userId: p.userId,
        role: p.role,
        status: p.status,
        joinTime: p.joinTime,
        leaveTime: p.leaveTime,
        flag: p.flag,
        username: p.User?.username,
        email: p.User?.email
      }))
    });

    res.json({
      success: true,
      data: {
        meeting: meetingInfo,
        participants: participants.map(p => ({
          id: p.id,
          userId: p.userId,
          role: p.role,
          status: p.status,
          joinTime: p.joinTime,
          leaveTime: p.leaveTime,
          flag: p.flag,
          username: p.User?.username,
          email: p.User?.email
        }))
      }
    });

  } catch (error) {
    console.error('Error debugging meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Error debugging meeting',
      error: error.message
    });
  }
});

// Leave meeting
router.post('/leave', authenticateToken, leaveMeeting);

// End meeting (host/admin only)
router.post('/end', authenticateToken, endMeeting);

// Auto-invite all participants to a meeting (host/admin only)
router.post('/auto-invite', authenticateToken, autoInviteParticipants);

// Auto-join meeting for invited participants
router.post('/auto-join', authenticateToken, autoJoinMeeting);

// Get active meetings
router.get('/active', authenticateToken, getActiveMeetings);

// Test WebSocket connection
router.get('/:meetingId/websocket-test', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    console.log(`WebSocket test for meeting ${meetingId} - User ID: ${userId}`);

    // Check if meeting exists
    const meeting = await models.Meeting.findByPk(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if user is in the meeting
    const userParticipant = await models.MeetingParticipant.findOne({
      where: { meetingId, userId, flag: 'Y' }
    });

    if (!userParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not in this meeting'
      });
    }

    res.json({
      success: true,
      message: 'WebSocket test endpoint accessible',
      data: {
        meetingId: meeting.meetingId,
        meetingStatus: meeting.status,
        userRole: userParticipant.role,
        websocketUrl: `ws://localhost:3000/meeting/${meetingId}`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error testing WebSocket:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing WebSocket',
      error: error.message
    });
  }
});

module.exports = router;
