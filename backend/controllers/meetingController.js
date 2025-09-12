const {
  Meeting,
  User,
  UserRole,
  MeetingParticipant,
  Materials,
} = require("../models");
const { getFilePath } = require("../middleware/upload");

async function getOrCreateDefaultMeeting() {
  let meeting = await Meeting.findOne({
    where: { isDefault: true, flag: "Y" },
  });
  if (!meeting) {
    meeting = await Meeting.create({
      meetingId: 1000,
      title: "UP-CONNECT Default Room",
      description: "Lobby selalu aktif.",
      startTime: new Date(),
      endTime: new Date("2099-12-31T23:59:59Z"),
      userId: null,
      status: "started",
      maxParticipants: 200,
      currentParticipants: 0,
      flag: "Y",
      isDefault: true,
    });
  }
  if (meeting.status !== "started") await meeting.update({ status: "started" });
  return meeting;
}

const getDefaultMeeting = async (_req, res) => {
  try {
    const m = await getOrCreateDefaultMeeting();
    res.json({
      success: true,
      data: {
        meetingId: m.meetingId,
        title: m.title,
        status: m.status,
        isDefault: m.isDefault,
        startTime: m.startTime,
        endTime: m.endTime,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const joinDefaultMeeting = async (req, res) => {
  try {
    const userId = req.user.id;
    const meeting = await getOrCreateDefaultMeeting();

    let p = await MeetingParticipant.findOne({
      where: { meetingId: meeting.meetingId, userId, flag: "Y" },
    });
    if (!p) {
      const user = await User.findOne({
        where: { id: userId },
        include: [{ model: UserRole, as: "UserRole" }],
      });
      await MeetingParticipant.create({
        meetingId: meeting.meetingId,
        userId,
        role:
          user?.UserRole?.nama === "admin"
            ? "admin"
            : user?.UserRole?.nama === "host"
            ? "host"
            : "participant",
        status: "joined",
        joinTime: new Date(),
        isAudioEnabled: true,
        isVideoEnabled: true,
        isScreenSharing: false,
        flag: "Y",
      });
      await meeting.update({
        currentParticipants: meeting.currentParticipants + 1,
      });
    }

    res.json({
      success: true,
      message: "Joined default meeting",
      data: {
        meetingId: meeting.meetingId,
        title: meeting.title,
        status: meeting.status,
        isDefault: meeting.isDefault,
        currentParticipants: meeting.currentParticipants,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Create a new meeting
const createMeeting = async (req, res) => {
  try {
    console.log("Create meeting - Request body:", req.body);
    console.log("Create meeting - User:", req.user);

    const { title, description, startTime, endTime, agendas, materials } =
      req.body;
    const userId = req.user.id; // From auth middleware

    // Validate required fields
    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Title, start time, and end time are required",
      });
    }

    // Check if user is host or admin
    const user = await User.findOne({
      where: { id: userId },
      include: [{ model: UserRole, as: "UserRole" }],
    });

    if (
      !user ||
      (user.UserRole.nama !== "host" && user.UserRole.nama !== "admin")
    ) {
      return res.status(403).json({
        success: false,
        message: "Only hosts and admins can create meetings",
      });
    }

    // Generate unique meeting ID
    const meetingId = Math.floor(Math.random() * 100000) + 1000; // Generate 4-digit ID

    // Determine meeting status based on whether it's quick start or scheduled
    // Quick start: if start time is in the past or now (within 5 minutes)
    const now = new Date();
    const startDateTime = new Date(startTime);
    const timeDiff = startDateTime.getTime() - now.getTime();
    const isQuickStart = timeDiff <= 5 * 60 * 1000; // Within 5 minutes = quick start

    console.log("Meeting time analysis:", {
      startTime: startTime,
      startDateTime: startDateTime,
      now: now,
      timeDiff: timeDiff,
      isQuickStart: isQuickStart,
    });

    const meetingStatus = isQuickStart ? "started" : "scheduled";

    // Create the meeting
    console.log("Creating meeting with status:", meetingStatus);
    const meeting = await Meeting.create({
      meetingId: meetingId,
      title: title,
      description: description || "",
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      userId: userId,
      status: meetingStatus, // 'started' for quick start, 'scheduled' for scheduled meetings
    });

    console.log("✅ Meeting created successfully:", {
      meetingId: meeting.meetingId,
      title: meeting.title,
      status: meeting.status,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
    });

    // Add creator as first participant
    const participantStatus = isQuickStart ? "joined" : "scheduled";
    const participantJoinTime = isQuickStart ? new Date() : null;

    const participant = await MeetingParticipant.create({
      meetingId: meeting.meetingId,
      userId,
      role: user.UserRole.nama === "admin" ? "admin" : "host",
      status: participantStatus, // 'joined' for quick start, 'scheduled' for scheduled meetings
      joinTime: participantJoinTime, // Set join time for quick start, null for scheduled
      isAudioEnabled: true,
      isVideoEnabled: true,
      isScreenSharing: false,
      flag: "Y",
    });

    console.log("Meeting participant created:", {
      participantId: participant.id,
      meetingId: participant.meetingId,
      userId: participant.userId,
      role: participant.role,
      status: participant.status,
    });

    // Update participant count (scheduled participants, not joined yet)
    await meeting.update({ currentParticipants: 1 });

    // Create agendas if provided
    if (agendas && Array.isArray(agendas) && agendas.length > 0) {
      try {
        const { Agenda } = require("../models");
        const agendaData = agendas.map((agenda) => ({
          meetingId: meeting.meetingId,
          judul: agenda.judul,
          deskripsi: agenda.deskripsi || null,
          startTime: agenda.start_time ? new Date(agenda.start_time) : null,
          endTime: agenda.end_time ? new Date(agenda.end_time) : null,
          seq: agenda.seq || 1,
          flag: "Y",
        }));

        console.log("Agenda data to create:", agendaData);
        const createdAgendas = await Agenda.bulkCreate(agendaData);
        console.log(
          `✅ Created ${createdAgendas.length} agendas for meeting ${meeting.meetingId}:`,
          createdAgendas.map((a) => ({ id: a.meetingAgendaId, judul: a.judul }))
        );
      } catch (agendaError) {
        console.error("❌ Error creating agendas:", agendaError);
        // Don't fail the meeting creation if agenda creation fails
      }
    }

    // Create materials if provided
    if (materials && Array.isArray(materials) && materials.length > 0) {
      try {
        console.log("📁 Processing materials:", materials.length, "files");

        const materialData = materials.map((material) => {
          // Generate proper file path for database
          const filePath = getFilePath(meeting.meetingId, material.name);

          return {
            meetingId: meeting.meetingId,
            path: filePath, // Store relative path in database
            flag: "Y",
          };
        });

        console.log("📁 Materials data to create:", materialData);
        const createdMaterials = await Materials.bulkCreate(materialData);
        console.log(
          `✅ Created ${createdMaterials.length} materials for meeting ${meeting.meetingId}:`,
          createdMaterials.map((m) => ({ id: m.id, path: m.path }))
        );

        // Note: Files will be uploaded separately via materials API endpoint
        // This just creates the database records
      } catch (materialError) {
        console.error("❌ Error creating materials:", materialError);
        // Don't fail the meeting creation if material creation fails
      }
    }

    // Verify participant was created
    const verifyParticipant = await MeetingParticipant.findOne({
      where: {
        meetingId: meeting.meetingId,
        userId,
        flag: "Y",
      },
    });

    console.log(
      "Verification - Participant in database:",
      verifyParticipant
        ? {
            id: verifyParticipant.id,
            meetingId: verifyParticipant.meetingId,
            userId: verifyParticipant.userId,
            role: verifyParticipant.role,
            status: verifyParticipant.status,
          }
        : "NOT FOUND"
    );

    console.log(
      "Meeting created successfully with first participant:",
      meeting
    );

    res.status(201).json({
      success: true,
      message: isQuickStart
        ? "Meeting started successfully"
        : "Meeting scheduled successfully",
      data: {
        meetingId: meeting.meetingId,
        title: meeting.title,
        description: meeting.description,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        userId: meeting.userId,
        status: meeting.status,
        currentParticipants: meeting.currentParticipants,
        agendasCount: agendas ? agendas.length : 0,
        materialsCount: materials ? materials.length : 0,
        isQuickStart: isQuickStart,
      },
    });
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Start meeting (host must actively start the meeting)
const startMeeting = async (req, res) => {
  try {
    console.log("Start meeting - Request body:", req.body);
    console.log("Start meeting - User:", req.user);

    const { meetingId } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!meetingId) {
      return res.status(400).json({
        success: false,
        message: "Meeting ID is required",
      });
    }

    // Check if meeting exists
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Check if user is the host of this meeting
    if (meeting.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the meeting host can start the meeting",
      });
    }

    // Check if meeting is in correct state to start
    if (meeting.status !== "scheduled") {
      return res.status(400).json({
        success: false,
        message: `Meeting cannot be started. Current status: ${meeting.status}. Only scheduled meetings can be started.`,
      });
    }

    // Update meeting status to 'started'
    await meeting.update({ status: "started" });

    // Update host participant status to 'joined' if not already
    await MeetingParticipant.update(
      { status: "joined" },
      {
        where: {
          meetingId,
          userId,
          role: "host",
          flag: "Y",
        },
      }
    );

    console.log("Meeting started successfully by host:", meetingId);

    res.json({
      success: true,
      message: "Meeting started successfully",
      data: {
        meetingId: meeting.meetingId,
        title: meeting.title,
        status: "started",
        startedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error starting meeting:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
        flag: "Y",
      },
      order: [["startTime", "DESC"]],
    });

    res.json({
      success: true,
      data: meetings,
    });
  } catch (error) {
    console.error("Error getting meetings:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
      include: [{ model: UserRole, as: "UserRole" }],
    });

    if (!user || user.UserRole.nama !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can view all meetings",
      });
    }

    const meetings = await Meeting.findAll({
      where: { flag: "Y" },
      include: [{ model: User, as: "User", attributes: ["username"] }],
      order: [["startTime", "DESC"]],
    });

    res.json({
      success: true,
      data: meetings,
    });
  } catch (error) {
    console.error("Error getting all meetings:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Join meeting
const joinMeeting = async (req, res) => {
  try {
    console.log("Join meeting - Request body:", req.body);
    console.log("Join meeting - User:", req.user);

    const { meetingId } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!meetingId) {
      return res.status(400).json({
        success: false,
        message: "Meeting ID is required",
      });
    }

    // Check if meeting exists
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Check if meeting is active and started
    if (meeting.status === "ended") {
      return res.status(400).json({
        success: false,
        message: "Meeting has ended",
      });
    }

    if (meeting.status === "waiting" || meeting.status === "active") {
      return res.status(400).json({
        success: false,
        message:
          "Meeting belum dimulai oleh host. Silakan tunggu host memulai meeting.",
      });
    }

    // Check if meeting has host
    const hostParticipant = await MeetingParticipant.findOne({
      where: {
        meetingId,
        role: "host",
        flag: "Y",
      },
    });

    if (!hostParticipant) {
      return res.status(400).json({
        success: false,
        message:
          "Meeting belum dimulai oleh host. Silakan tunggu host bergabung.",
      });
    }

    // Check if host is currently online (has joined the meeting)
    if (hostParticipant.status !== "joined") {
      return res.status(400).json({
        success: false,
        message:
          "Host belum bergabung ke meeting. Silakan tunggu host bergabung.",
      });
    }

    // Check if user is already in the meeting
    const existingParticipant = await MeetingParticipant.findOne({
      where: { meetingId, userId, flag: "Y" },
    });

    if (existingParticipant) {
      // If user is already in meeting, just return success (allow re-join)
      console.log("User already in meeting, allowing re-join:", userId);
      return res.json({
        success: true,
        message: "User already in meeting",
        data: {
          meetingId: meeting.meetingId,
          title: meeting.title,
          description: meeting.description,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          userId: meeting.userId,
          status: meeting.status,
          currentParticipants: meeting.currentParticipants,
        },
      });
    }

    // Check if meeting is full
    if (meeting.currentParticipants >= meeting.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: "Meeting is full",
      });
    }

    // Get user role
    const user = await User.findOne({
      where: { id: userId },
      include: [{ model: UserRole, as: "UserRole" }],
    });

    // Add user as participant
    await MeetingParticipant.create({
      meetingId,
      userId,
      role:
        user.UserRole.nama === "admin"
          ? "admin"
          : user.UserRole.nama === "host"
          ? "host"
          : "participant",
      status: "joined",
      joinTime: new Date(),
      isAudioEnabled: true,
      isVideoEnabled: true,
      isScreenSharing: false,
      flag: "Y",
    });

    // Update participant count
    await meeting.update({
      currentParticipants: meeting.currentParticipants + 1,
    });

    console.log("User joined meeting successfully");

    res.json({
      success: true,
      message: "Joined meeting successfully",
      data: meeting,
    });
  } catch (error) {
    console.error("Error joining meeting:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
      where: { meetingId, userId, flag: "Y" },
    });

    if (!userParticipant) {
      return res.status(403).json({
        success: false,
        message: "You are not in this meeting",
      });
    }

    // Get all participants
    const participants = await MeetingParticipant.findAll({
      where: { meetingId, flag: "Y" },
      include: [{ model: User, as: "User", attributes: ["username"] }],
      order: [["joinTime", "ASC"]],
    });

    console.log(
      "Meeting participants found:",
      participants.map((p) => ({
        userId: p.userId,
        role: p.role,
        status: p.status,
        user: p.User,
      }))
    );

    res.json({
      success: true,
      data: participants,
    });
  } catch (error) {
    console.error("Error getting meeting participants:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
      where: { meetingId, userId, flag: "Y" },
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: "You are not in this meeting",
      });
    }

    // Update participant status
    await participant.update({
      status: "left",
      leaveTime: new Date(),
      flag: "N",
    });

    // Get meeting and update participant count
    const meeting = await Meeting.findByPk(meetingId);
    if (meeting) {
      const newCount = Math.max(0, meeting.currentParticipants - 1);
      await meeting.update({
        currentParticipants: newCount,
        status: newCount === 0 ? "ended" : meeting.status,
      });
    }

    console.log("User left meeting successfully");

    res.json({
      success: true,
      message: "Left meeting successfully",
    });
  } catch (error) {
    console.error("Error leaving meeting:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
      where: { meetingId, userId, flag: "Y" },
    });

    if (
      !participant ||
      (participant.role !== "host" && participant.role !== "admin")
    ) {
      return res.status(403).json({
        success: false,
        message: "Only hosts and admins can end meetings",
      });
    }

    // End the meeting
    const meeting = await Meeting.findByPk(meetingId);
    if (meeting) {
      await meeting.update({
        status: "ended",
        endTime: new Date(),
      });
    }

    // Mark all participants as left
    await MeetingParticipant.update(
      {
        status: "left",
        leaveTime: new Date(),
        flag: "N",
      },
      { where: { meetingId, flag: "Y" } }
    );

    console.log("Meeting ended successfully");

    // Send WebSocket notification to all participants
    if (global.wss) {
      const { wss } = global;
      wss.clients.forEach((client) => {
        if (client.readyState === 1 && client.meetingId === meetingId) {
          client.send(
            JSON.stringify({
              type: "meeting-ended",
              meetingId: meetingId,
              endedBy: userId,
              timestamp: new Date().toISOString(),
            })
          );
        }
      });
    }

    res.json({
      success: true,
      message: "Meeting ended successfully",
    });
  } catch (error) {
    console.error("Error ending meeting:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getActiveMeetings = async (req, res) => {
  try {
    console.log("Getting active meetings...");

    // Get all meetings that are currently started (ready for participants to join)
    const activeMeetings = await Meeting.findAll({
      where: {
        status: "started",
      },
      include: [
        {
          model: User,
          as: "Host",
          attributes: ["id", "username"],
        },
        {
          model: MeetingParticipant,
          as: "Participants",
          include: [
            {
              model: User,
              as: "User",
              attributes: ["id", "username"],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]], // Fixed: use created_at instead of createdAt
    });

    console.log(`Found ${activeMeetings.length} active meetings`);

    // Format the response
    const formattedMeetings = activeMeetings.map((meeting) => ({
      meetingId: meeting.meetingId,
      title: meeting.title,
      description: meeting.description,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      status: meeting.status,
      hostName: meeting.Host ? meeting.Host.username : "Unknown",
      currentParticipants: meeting.Participants
        ? meeting.Participants.length
        : 0,
      createdAt: meeting.createdAt,
    }));

    res.json({
      success: true,
      message: "Active meetings retrieved successfully",
      data: formattedMeetings,
    });
  } catch (error) {
    console.error("Error getting active meetings:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Check meeting status for participant (for polling/auto-exit)
const checkMeetingStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    console.log(
      `Checking meeting status for meeting ${meetingId}, user ${userId}`
    );

    // Check if meeting exists
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      console.log(`Meeting ${meetingId} not found`);
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Check if user is participant in this meeting
    const participant = await MeetingParticipant.findOne({
      where: {
        meetingId,
        userId,
        flag: "Y",
      },
    });

    if (!participant) {
      console.log(
        `User ${userId} is not a participant in meeting ${meetingId}`
      );
      return res.status(403).json({
        success: false,
        message: "User is not a participant in this meeting",
      });
    }

    console.log(
      `Meeting ${meetingId} status: ${meeting.status}, User role: ${participant.role}`
    );

    // Return meeting status
    res.json({
      success: true,
      message: "Meeting status retrieved successfully",
      data: {
        meetingId: meeting.meetingId,
        title: meeting.title,
        status: meeting.status,
        isActive: meeting.status === "started",
        participantRole: participant.role,
        participantStatus: participant.status,
        endTime: meeting.endTime,
      },
    });
  } catch (error) {
    console.error("Error checking meeting status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get scheduled meetings by current user
const getScheduledMeetings = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("Getting scheduled meetings for user:", userId);

    // Get all meetings with status 'scheduled' for current user
    const scheduledMeetings = await Meeting.findAll({
      where: {
        userId: userId,
        status: "scheduled",
        flag: "Y",
      },
      include: [
        {
          model: MeetingParticipant,
          as: "Participants",
          where: { flag: "Y" },
          required: false,
        },
      ],
      order: [["startTime", "ASC"]],
    });

    console.log(
      `Found ${scheduledMeetings.length} scheduled meetings for user ${userId}`
    );

    // Format the response
    const formattedMeetings = scheduledMeetings.map((meeting) => ({
      meetingId: meeting.meetingId,
      title: meeting.title,
      description: meeting.description,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      status: meeting.status,
      participants: meeting.Participants ? meeting.Participants.length : 0,
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
    }));

    res.json({
      success: true,
      message: "Scheduled meetings retrieved successfully",
      data: formattedMeetings,
    });
  } catch (error) {
    console.error("Error getting scheduled meetings:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Check meeting status (for participants to validate before joining)
const checkMeetingStatusForJoin = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    console.log(
      `Meeting status check - Meeting ID: ${meetingId}, User ID: ${userId}`
    );

    // Check if meeting exists
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      console.log(`Meeting ${meetingId} not found`);
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Check if meeting is active and started
    const isActive = meeting.status === "started";

    // Check if meeting has host
    const hostParticipant = await MeetingParticipant.findOne({
      where: {
        meetingId,
        role: "host",
        flag: "Y",
      },
    });

    const hasHost = !!hostParticipant;
    const hostOnline = hasHost && hostParticipant.status === "joined";

    // Get participant count with detailed logging
    const allParticipants = await MeetingParticipant.findAll({
      where: { meetingId, flag: "Y" },
      include: [
        {
          model: User,
          as: "User",
          attributes: ["id", "username"],
        },
      ],
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
      participants: allParticipants.map((p) => ({
        userId: p.userId,
        role: p.userRole,
        status: p.status,
        username: p.User?.username,
      })),
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
        endTime: meeting.endTime,
      },
    });
  } catch (error) {
    console.error("Error checking meeting status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Public meeting status check (no auth required)
const getPublicMeetingStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;

    console.log(`Public meeting status check - Meeting ID: ${meetingId}`);

    // Check if meeting exists
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      console.log(`Meeting ${meetingId} not found`);
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Check if meeting is active and started
    const isActive = meeting.status === "started";

    // Check if meeting has host
    const hostParticipant = await MeetingParticipant.findOne({
      where: {
        meetingId,
        role: "host",
        flag: "Y",
      },
    });

    const hasHost = !!hostParticipant;
    const hostOnline = hasHost && hostParticipant.status === "joined";

    // Get participant count
    const allParticipants = await MeetingParticipant.findAll({
      where: { meetingId, flag: "Y" },
    });

    const participantCount = allParticipants.length;

    console.log(`Public meeting ${meetingId} status:`, {
      meetingId: meeting.meetingId,
      status: meeting.status,
      isActive,
      hasHost,
      hostOnline,
      participantCount,
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
        endTime: meeting.endTime,
      },
    });
  } catch (error) {
    console.error("Error checking public meeting status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get active meetings for participants to join (no auth required)
const getPublicActiveMeetings = async (req, res) => {
  try {
    console.log("Getting public active meetings");

    // Find meetings that are started and flagged Y (no include to avoid alias issues)
    const activeMeetings = await Meeting.findAll({
      where: {
        status: "started",
        flag: "Y",
      },
      order: [["created_at", "DESC"]],
      limit: 10,
      raw: true,
    });

    // For each meeting, verify there is a host participant with flag Y
    const verifiedMeetings = [];
    for (const meeting of activeMeetings) {
      const host = await MeetingParticipant.findOne({
        where: {
          meetingId: meeting.meeting_id || meeting.meetingId,
          role: "host",
          flag: "Y",
        },
        raw: true,
      });
      if (host) {
        verifiedMeetings.push({
          meetingId: meeting.meeting_id || meeting.meetingId,
          title: meeting.title,
          description: meeting.description,
          status: meeting.status,
          startTime: meeting.start_time || meeting.startTime,
          endTime: meeting.end_time || meeting.endTime,
          participantCount:
            meeting.current_participants || meeting.currentParticipants || 0,
        });
      }
    }

    console.log(`Found ${verifiedMeetings.length} active meetings with host`);

    res.json({
      success: true,
      data: verifiedMeetings,
    });
  } catch (error) {
    console.error("Error getting public active meetings:", error);
    res.status(500).json({
      success: false,
      message: "Error getting active meetings",
      error: error.message,
    });
  }
};

// Debug meeting participants in detail
const debugMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    console.log(`Debug meeting ${meetingId} - User ID: ${userId}`);

    // Check if meeting exists
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Get all participants with detailed info
    const participants = await MeetingParticipant.findAll({
      where: { meetingId, flag: "Y" },
      include: [
        {
          model: User,
          as: "User",
          attributes: ["id", "username", "email"],
        },
      ],
      order: [["joinTime", "ASC"]],
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
      updated_at: meeting.updated_at,
    };

    console.log(`Debug meeting ${meetingId} results:`, {
      meeting: meetingInfo,
      participants: participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        role: p.role,
        status: p.status,
        joinTime: p.joinTime,
        leaveTime: p.leaveTime,
        flag: p.flag,
        username: p.User?.username,
        email: p.User?.email,
      })),
    });

    res.json({
      success: true,
      data: {
        meeting: meetingInfo,
        participants: participants.map((p) => ({
          id: p.id,
          userId: p.userId,
          role: p.role,
          status: p.status,
          joinTime: p.joinTime,
          leaveTime: p.leaveTime,
          flag: p.flag,
          username: p.User?.username,
          email: p.User?.email,
        })),
      },
    });
  } catch (error) {
    console.error("Error debugging meeting:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Test WebSocket connection
const testWebSocket = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    console.log(`WebSocket test for meeting ${meetingId} - User ID: ${userId}`);

    // Check if meeting exists
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Check if user is in the meeting
    const userParticipant = await MeetingParticipant.findOne({
      where: { meetingId, userId, flag: "Y" },
    });

    if (!userParticipant) {
      return res.status(403).json({
        success: false,
        message: "You are not in this meeting",
      });
    }

    res.json({
      success: true,
      message: "WebSocket test endpoint accessible",
      data: {
        meetingId: meeting.meetingId,
        meetingStatus: meeting.status,
        userRole: userParticipant.role,
        websocketUrl: `ws://localhost:3000/meeting/${meetingId}`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error testing WebSocket:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Auto-invite all participants to a meeting
const autoInviteParticipants = async (req, res) => {
  try {
    console.log("Auto-invite participants - Request body:", req.body);
    const { meetingId } = req.body;
    const hostId = req.user.id;

    // Check if meeting exists and is active
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    if (meeting.status !== "started") {
      return res.status(400).json({
        success: false,
        message:
          "Meeting belum dimulai oleh host. Silakan tunggu host memulai meeting.",
      });
    }

    // Get all participants (users with role 'participant')
    const participants = await User.findAll({
      include: [
        {
          model: UserRole,
          as: "UserRole",
          where: { nama: "participant" },
        },
      ],
    });

    console.log(`Found ${participants.length} participants to invite`);

    let invitedCount = 0;
    const invitePromises = participants.map(async (participant) => {
      try {
        // Check if participant is already in the meeting
        const existingParticipant = await MeetingParticipant.findOne({
          where: { meetingId, userId: participant.id, flag: "Y" },
        });

        if (!existingParticipant) {
          // Add participant to meeting
          await MeetingParticipant.create({
            meetingId,
            userId: participant.id,
            role: "participant",
            status: "invited", // New status: invited
            joinTime: null, // Will be set when they actually join
            isAudioEnabled: false,
            isVideoEnabled: false,
            isScreenSharing: false,
            flag: "Y",
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
      where: { meetingId, flag: "Y" },
    });
    await meeting.update({ currentParticipants: totalParticipants });

    console.log(`Successfully invited ${invitedCount} participants`);

    res.json({
      success: true,
      message: `Successfully invited ${invitedCount} participants`,
      data: {
        meetingId,
        invitedCount,
        participantCount: totalParticipants,
      },
    });
  } catch (error) {
    console.error("Error auto-inviting participants:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Auto-join meeting for invited participants
const autoJoinMeeting = async (req, res) => {
  try {
    console.log("Auto-join meeting - Request body:", req.body);
    const { meetingId } = req.body;
    const userId = req.user.id;

    // Check if meeting exists and is active
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    if (meeting.status !== "started") {
      return res.status(400).json({
        message:
          "Meeting belum dimulai oleh host. Silakan tunggu host memulai meeting.",
      });
    }

    // Check if meeting has host
    const hostParticipant = await MeetingParticipant.findOne({
      where: {
        meetingId,
        role: "host",
        flag: "Y",
      },
    });

    if (!hostParticipant) {
      return res.status(400).json({
        success: false,
        message:
          "Meeting belum dimulai oleh host. Silakan tunggu host bergabung.",
      });
    }

    // Check if host is currently online (has joined the meeting)
    if (hostParticipant.status !== "joined") {
      return res.status(400).json({
        success: false,
        message:
          "Host belum bergabung ke meeting. Silakan tunggu host bergabung.",
      });
    }

    // Check if user is already in the meeting
    const existingParticipant = await MeetingParticipant.findOne({
      where: { meetingId, userId, flag: "Y" },
    });

    if (existingParticipant) {
      if (existingParticipant.status === "invited") {
        // Update status to joined
        await existingParticipant.update({
          status: "joined",
          joinTime: new Date(),
        });
        console.log("User auto-joined meeting successfully");
      } else {
        // User already joined
        console.log("User already in meeting");
      }
    } else {
      // Add user as participant if not already invited
      await MeetingParticipant.create({
        meetingId,
        userId,
        role: "participant",
        status: "joined",
        joinTime: new Date(),
        isAudioEnabled: false,
        isVideoEnabled: false,
        isScreenSharing: false,
        flag: "Y",
      });
      console.log("User added and auto-joined meeting");
    }

    // Get updated participant count
    const totalParticipants = await MeetingParticipant.count({
      where: { meetingId, flag: "Y" },
    });
    await meeting.update({ currentParticipants: totalParticipants });

    res.json({
      success: true,
      message: "Auto-joined meeting successfully",
      data: {
        meetingId: meeting.meetingId,
        title: meeting.title,
        description: meeting.description,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        userId: meeting.userId,
        status: meeting.status,
        currentParticipants: totalParticipants,
      },
    });
  } catch (error) {
    console.error("Error auto-joining meeting:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
  checkMeetingStatus,
  getScheduledMeetings,
  checkMeetingStatusForJoin,
  getPublicMeetingStatus,
  getPublicActiveMeetings,
  debugMeeting,
  testWebSocket,
  getDefaultMeeting,
  getOrCreateDefaultMeeting,
  joinDefaultMeeting,
};
