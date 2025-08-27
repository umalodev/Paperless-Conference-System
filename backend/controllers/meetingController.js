const { Meeting, User, UserRole, MeetingParticipant } = require('../models');

// Create a new meeting
const createMeeting = async (req, res) => {
  try {
    console.log('Create meeting - Request body:', req.body);
    console.log('Create meeting - User:', req.user);
    
    const { title, description, startTime, endTime } = req.body;
    const userId = req.user.id; // From auth middleware

    // Validate required fields
    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Title, start time, and end time are required'
      });
    }

    // Check if user is host or admin
    const user = await User.findOne({
      where: { id: userId },
      include: [{ model: UserRole, as: 'UserRole' }]
    });

    if (!user || (user.UserRole.nama !== 'host' && user.UserRole.nama !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only hosts and admins can create meetings'
      });
    }

    // Generate unique meeting ID
    const meetingId = Math.floor(Math.random() * 100000) + 1000; // Generate 4-digit ID

    // Create the meeting
    const meeting = await Meeting.create({
      meetingId: meetingId,
      title: title,
      description: description || '',
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      userId: userId,
      status: 'started'  // Automatically start the meeting when created by host
    });

    // Add creator as first participant
    const participant = await MeetingParticipant.create({
      meetingId: meeting.meetingId,
      userId,
      role: user.UserRole.nama === 'admin' ? 'admin' : 'host',
      status: 'joined',
      joinTime: new Date(),
      isAudioEnabled: true,
      isVideoEnabled: true,
      isScreenSharing: false,
      flag: 'Y'
    });

    console.log('Meeting participant created:', {
      participantId: participant.id,
      meetingId: participant.meetingId,
      userId: participant.userId,
      role: participant.role,
      status: participant.status
    });

    // Update participant count
    await meeting.update({ currentParticipants: 1 });

    // Verify participant was created
    const verifyParticipant = await MeetingParticipant.findOne({
      where: { 
        meetingId: meeting.meetingId, 
        userId, 
        flag: 'Y' 
      }
    });

    console.log('Verification - Participant in database:', verifyParticipant ? {
      id: verifyParticipant.id,
      meetingId: verifyParticipant.meetingId,
      userId: verifyParticipant.userId,
      role: verifyParticipant.role,
      status: verifyParticipant.status
    } : 'NOT FOUND');

    console.log('Meeting created successfully with first participant:', meeting);

    res.status(201).json({
      success: true,
      message: 'Meeting created and started successfully',
      data: {
        meetingId: meeting.meetingId,
        title: meeting.title,
        description: meeting.description,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        userId: meeting.userId,
        status: meeting.status,
        currentParticipants: meeting.currentParticipants
      }
    });

  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Start meeting (host must actively start the meeting)
const startMeeting = async (req, res) => {
  try {
    console.log('Start meeting - Request body:', req.body);
    console.log('Start meeting - User:', req.user);
    
    const { meetingId } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!meetingId) {
      return res.status(400).json({
        success: false,
        message: 'Meeting ID is required'
      });
    }

    // Check if meeting exists
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if user is the host of this meeting
    if (meeting.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the meeting host can start the meeting'
      });
    }

    // Check if meeting is in correct state to start
    if (meeting.status !== 'started') {
      return res.status(400).json({
        success: false,
        message: `Meeting is already in status: ${meeting.status}. No action needed.`
      });
    }

    // Update meeting status to 'started'
    await meeting.update({ status: 'started' });

    // Update host participant status to 'joined' if not already
    await MeetingParticipant.update(
      { status: 'joined' },
      { 
        where: { 
          meetingId, 
          userId, 
          role: 'host',
          flag: 'Y' 
        } 
      }
    );

    console.log('Meeting started successfully by host:', meetingId);

    res.json({
      success: true,
      message: 'Meeting started successfully',
      data: {
        meetingId: meeting.meetingId,
        title: meeting.title,
        status: 'started',
        startedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error starting meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get meetings by user
const getMeetingsByUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const meetings = await Meeting.findAll({
      where: { 
        userId,
        flag: 'Y'
      },
      order: [['startTime', 'DESC']]
    });

    res.json({
      success: true,
      data: meetings
    });

  } catch (error) {
    console.error('Error getting meetings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all meetings (for admin)
const getAllMeetings = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user is admin
    const user = await User.findOne({
      where: { id: userId },
      include: [{ model: UserRole, as: 'UserRole' }]
    });

    if (!user || user.UserRole.nama !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view all meetings'
      });
    }

    const meetings = await Meeting.findAll({
      where: { flag: 'Y' },
      include: [{ model: User, as: 'User', attributes: ['username'] }],
      order: [['startTime', 'DESC']]
    });

    res.json({
      success: true,
      data: meetings
    });

  } catch (error) {
    console.error('Error getting all meetings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Join meeting
const joinMeeting = async (req, res) => {
  try {
    console.log('Join meeting - Request body:', req.body);
    console.log('Join meeting - User:', req.user);
    
    const { meetingId } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!meetingId) {
      return res.status(400).json({
        success: false,
        message: 'Meeting ID is required'
      });
    }

    // Check if meeting exists
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if meeting is active and started
    if (meeting.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: 'Meeting has ended'
      });
    }

    if (meeting.status === 'waiting' || meeting.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Meeting belum dimulai oleh host. Silakan tunggu host memulai meeting.'
      });
    }

    // Check if meeting has host
    const hostParticipant = await MeetingParticipant.findOne({
      where: { 
        meetingId, 
        role: 'host', 
        flag: 'Y' 
      }
    });

    if (!hostParticipant) {
      return res.status(400).json({
        success: false,
        message: 'Meeting belum dimulai oleh host. Silakan tunggu host bergabung.'
      });
    }

    // Check if host is currently online (has joined the meeting)
    if (hostParticipant.status !== 'joined') {
      return res.status(400).json({
        success: false,
        message: 'Host belum bergabung ke meeting. Silakan tunggu host bergabung.'
      });
    }

    // Check if user is already in the meeting
    const existingParticipant = await MeetingParticipant.findOne({
      where: { meetingId, userId, flag: 'Y' }
    });

    if (existingParticipant) {
      // If user is already in meeting, just return success (allow re-join)
      console.log('User already in meeting, allowing re-join:', userId);
      return res.json({
        success: true,
        message: 'User already in meeting',
        data: {
          meetingId: meeting.meetingId,
          title: meeting.title,
          description: meeting.description,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          userId: meeting.userId,
          status: meeting.status,
          currentParticipants: meeting.currentParticipants
        }
      });
    }

    // Check if meeting is full
    if (meeting.currentParticipants >= meeting.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Meeting is full'
      });
    }

    // Get user role
    const user = await User.findOne({
      where: { id: userId },
      include: [{ model: UserRole, as: 'UserRole' }]
    });

    // Add user as participant
    await MeetingParticipant.create({
      meetingId,
      userId,
      role: user.UserRole.nama === 'admin' ? 'admin' : 
            user.UserRole.nama === 'host' ? 'host' : 'participant',
      status: 'joined',
      joinTime: new Date(),
      isAudioEnabled: true,
      isVideoEnabled: true,
      isScreenSharing: false,
      flag: 'Y'
    });

    // Update participant count
    await meeting.update({ 
      currentParticipants: meeting.currentParticipants + 1
    });

    console.log('User joined meeting successfully');

    res.json({
      success: true,
      message: 'Joined meeting successfully',
      data: meeting
    });

  } catch (error) {
    console.error('Error joining meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get meeting participants
const getMeetingParticipants = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    // Check if user is in the meeting
    const userParticipant = await MeetingParticipant.findOne({
      where: { meetingId, userId, flag: 'Y' }
    });

    if (!userParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not in this meeting'
      });
    }

    // Get all participants
    const participants = await MeetingParticipant.findAll({
      where: { meetingId, flag: 'Y' },
      include: [{ model: User, as: 'User', attributes: ['username'] }],
      order: [['joinTime', 'ASC']]
    });

    console.log('Meeting participants found:', participants.map(p => ({
      userId: p.userId,
      role: p.role,
      status: p.status,
      user: p.User
    })));

    res.json({
      success: true,
      data: participants
    });

  } catch (error) {
    console.error('Error getting meeting participants:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Leave meeting
const leaveMeeting = async (req, res) => {
  try {
    const { meetingId } = req.body;
    const userId = req.user.id;

    // Check if user is in the meeting
    const participant = await MeetingParticipant.findOne({
      where: { meetingId, userId, flag: 'Y' }
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: 'You are not in this meeting'
      });
    }

    // Update participant status
    await participant.update({
      status: 'left',
      leaveTime: new Date(),
      flag: 'N'
    });

    // Get meeting and update participant count
    const meeting = await Meeting.findByPk(meetingId);
    if (meeting) {
      const newCount = Math.max(0, meeting.currentParticipants - 1);
      await meeting.update({ 
        currentParticipants: newCount,
        status: newCount === 0 ? 'ended' : meeting.status
      });
    }

    console.log('User left meeting successfully');

    res.json({
      success: true,
      message: 'Left meeting successfully'
    });

  } catch (error) {
    console.error('Error leaving meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// End meeting (host/admin only)
const endMeeting = async (req, res) => {
  try {
    const { meetingId } = req.body;
    const userId = req.user.id;

    // Check if user is host or admin in the meeting
    const participant = await MeetingParticipant.findOne({
      where: { meetingId, userId, flag: 'Y' }
    });

    if (!participant || (participant.role !== 'host' && participant.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only hosts and admins can end meetings'
      });
    }

    // End the meeting
    const meeting = await Meeting.findByPk(meetingId);
    if (meeting) {
      await meeting.update({ 
        status: 'ended',
        endTime: new Date()
      });
    }

    // Mark all participants as left
    await MeetingParticipant.update(
      { 
        status: 'left',
        leaveTime: new Date(),
        flag: 'N'
      },
      { where: { meetingId, flag: 'Y' } }
    );

    console.log('Meeting ended successfully');

    res.json({
      success: true,
      message: 'Meeting ended successfully'
    });

  } catch (error) {
    console.error('Error ending meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getActiveMeetings = async (req, res) => {
  try {
    console.log('Getting active meetings...');
    
    // Get all meetings that are currently started (ready for participants to join)
    const activeMeetings = await Meeting.findAll({
      where: {
        status: 'started'
      },
      include: [
        {
          model: User,
          as: 'Host',
          attributes: ['id', 'username']
        },
        {
          model: MeetingParticipant,
          as: 'Participants',
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['id', 'username']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]  // Fixed: use created_at instead of createdAt
    });

    console.log(`Found ${activeMeetings.length} active meetings`);

    // Format the response
    const formattedMeetings = activeMeetings.map(meeting => ({
      meetingId: meeting.meetingId,
      title: meeting.title,
      description: meeting.description,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      status: meeting.status,
      hostName: meeting.Host ? meeting.Host.username : 'Unknown',
      currentParticipants: meeting.Participants ? meeting.Participants.length : 0,
      createdAt: meeting.createdAt
    }));

    res.json({
      success: true,
      message: 'Active meetings retrieved successfully',
      data: formattedMeetings
    });

  } catch (error) {
    console.error('Error getting active meetings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Check meeting status for participant (for polling/auto-exit)
const checkMeetingStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    console.log(`Checking meeting status for meeting ${meetingId}, user ${userId}`);

    // Check if meeting exists
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      console.log(`Meeting ${meetingId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if user is participant in this meeting
    const participant = await MeetingParticipant.findOne({
      where: { 
        meetingId, 
        userId, 
        flag: 'Y' 
      }
    });

    if (!participant) {
      console.log(`User ${userId} is not a participant in meeting ${meetingId}`);
      return res.status(403).json({
        success: false,
        message: 'User is not a participant in this meeting'
      });
    }

    console.log(`Meeting ${meetingId} status: ${meeting.status}, User role: ${participant.role}`);

    // Return meeting status
    res.json({
      success: true,
      message: 'Meeting status retrieved successfully',
      data: {
        meetingId: meeting.meetingId,
        title: meeting.title,
        status: meeting.status,
        isActive: meeting.status === 'started',
        participantRole: participant.role,
        participantStatus: participant.status,
        endTime: meeting.endTime
      }
    });

  } catch (error) {
    console.error('Error checking meeting status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Auto-invite all participants to a meeting
const autoInviteParticipants = async (req, res) => {
  try {
    console.log('Auto-invite participants - Request body:', req.body);
    const { meetingId } = req.body;
    const hostId = req.user.id;

    // Check if meeting exists and is active
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    if (meeting.status !== 'started') {
      return res.status(400).json({
        success: false,
        message: 'Meeting belum dimulai oleh host. Silakan tunggu host memulai meeting.'
      });
    }

    // Get all participants (users with role 'participant')
    const participants = await User.findAll({
      include: [{
        model: UserRole,
        as: 'UserRole',
        where: { nama: 'participant' }
      }]
    });

    console.log(`Found ${participants.length} participants to invite`);

    let invitedCount = 0;
    const invitePromises = participants.map(async (participant) => {
      try {
        // Check if participant is already in the meeting
        const existingParticipant = await MeetingParticipant.findOne({
          where: { meetingId, userId: participant.id, flag: 'Y' }
        });

        if (!existingParticipant) {
          // Add participant to meeting
          await MeetingParticipant.create({
            meetingId,
            userId: participant.id,
            role: 'participant',
            status: 'invited', // New status: invited
            joinTime: null, // Will be set when they actually join
            isAudioEnabled: false,
            isVideoEnabled: false,
            isScreenSharing: false,
            flag: 'Y'
          });
          invitedCount++;
        }
      } catch (error) {
        console.error(`Error inviting participant ${participant.id}:`, error);
      }
    });

    await Promise.all(invitePromises);

    // Update meeting participant count
    const totalParticipants = await MeetingParticipant.count({
      where: { meetingId, flag: 'Y' }
    });
    await meeting.update({ currentParticipants: totalParticipants });

    console.log(`Successfully invited ${invitedCount} participants`);

    res.json({
      success: true,
      message: `Successfully invited ${invitedCount} participants`,
      data: {
        meetingId,
        invitedCount,
        participantCount: totalParticipants
      }
    });

  } catch (error) {
    console.error('Error auto-inviting participants:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Auto-join meeting for invited participants
const autoJoinMeeting = async (req, res) => {
  try {
    console.log('Auto-join meeting - Request body:', req.body);
    const { meetingId } = req.body;
    const userId = req.user.id;

    // Check if meeting exists and is active
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    if (meeting.status !== 'started') {
      return res.status(400).json({
        message: 'Meeting belum dimulai oleh host. Silakan tunggu host memulai meeting.'
      });
    }

    // Check if meeting has host
    const hostParticipant = await MeetingParticipant.findOne({
      where: { 
        meetingId, 
        role: 'host', 
        flag: 'Y' 
      }
    });

    if (!hostParticipant) {
      return res.status(400).json({
        success: false,
        message: 'Meeting belum dimulai oleh host. Silakan tunggu host bergabung.'
      });
    }

    // Check if host is currently online (has joined the meeting)
    if (hostParticipant.status !== 'joined') {
      return res.status(400).json({
        success: false,
        message: 'Host belum bergabung ke meeting. Silakan tunggu host bergabung.'
      });
    }

    // Check if user is already in the meeting
    const existingParticipant = await MeetingParticipant.findOne({
      where: { meetingId, userId, flag: 'Y' }
    });

    if (existingParticipant) {
      if (existingParticipant.status === 'invited') {
        // Update status to joined
        await existingParticipant.update({
          status: 'joined',
          joinTime: new Date()
        });
        console.log('User auto-joined meeting successfully');
      } else {
        // User already joined
        console.log('User already in meeting');
      }
    } else {
      // Add user as participant if not already invited
      await MeetingParticipant.create({
        meetingId,
        userId,
        role: 'participant',
        status: 'joined',
        joinTime: new Date(),
        isAudioEnabled: false,
        isVideoEnabled: false,
        isScreenSharing: false,
        flag: 'Y'
      });
      console.log('User added and auto-joined meeting');
    }

    // Get updated participant count
    const totalParticipants = await MeetingParticipant.count({
      where: { meetingId, flag: 'Y' }
    });
    await meeting.update({ currentParticipants: totalParticipants });

    res.json({
      success: true,
      message: 'Auto-joined meeting successfully',
      data: {
        meetingId: meeting.meetingId,
        title: meeting.title,
        description: meeting.description,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        userId: meeting.userId,
        status: meeting.status,
        currentParticipants: totalParticipants
      }
    });

  } catch (error) {
    console.error('Error auto-joining meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
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
  checkMeetingStatus
};
