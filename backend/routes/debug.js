const express = require('express');
const router = express.Router();
const { User, Meeting, MeetingParticipant, UserRole } = require('../models');

// Get basic info for debugging (no auth required)
router.get('/basic', async (req, res) => {
  try {
    // Get basic counts
    const userCount = await User.count();
    const meetingCount = await Meeting.count();
    const participantCount = await MeetingParticipant.count();
    
    // Get first few users
    const users = await User.findAll({
      limit: 5,
      attributes: ['id', 'username'],
      include: [{
        model: UserRole,
        as: 'UserRole',
        attributes: ['nama']
      }]
    });
    
    // Get first few meetings
    const meetings = await Meeting.findAll({
      limit: 5,
      attributes: ['meetingId', 'title', 'status']
    });

    // Get first few participants
    const participants = await MeetingParticipant.findAll({
      limit: 5,
      attributes: ['participantId', 'meetingId', 'userId', 'role', 'status'],
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['username']
        },
        {
          model: Meeting,
          as: 'Meeting',
          attributes: ['title']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        counts: {
          users: userCount,
          meetings: meetingCount,
          participants: participantCount
        },
        users: users,
        meetings: meetings,
        participants: participants
      }
    });

  } catch (error) {
    console.error('Error getting basic info:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
