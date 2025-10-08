const {
  MeetingParticipant,
  User,
  Meeting,
  UserRole,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");

function normalizeDisplayName(s) {
  return (s ?? "").toString().trim().replace(/\s+/g, " ").slice(0, 100);
}

// Ambil nama dari req.body / header / user record
async function pickDisplayName({ req, explicit, userId, models }) {
  const bodyName = normalizeDisplayName(explicit ?? req.body?.displayName);
  const headerName = normalizeDisplayName(req.headers["x-display-name"]);
  if (bodyName) return bodyName;
  if (headerName) return headerName;

  // fallback ke username akun
  if (userId) {
    const user = await models.User.findByPk(userId);
    const fromUser = normalizeDisplayName(user?.username);
    if (fromUser) return fromUser;
  }
  return "Participant";
}

const getJoinedParticipants = async (req, res) => {
  try {
    const { meetingId } = req.query; // ← optional filter by meeting
    const where = { status: "joined", flag: "Y" };
    if (meetingId) where.meetingId = meetingId;

    const participants = await MeetingParticipant.findAll({
      where,
      include: [
        {
          model: User,
          as: "User",
          attributes: ["id", "username"],
          include: [{ model: UserRole, as: "UserRole", attributes: ["nama"] }],
        },
        {
          model: Meeting,
          as: "Meeting",
          attributes: ["meetingId", "title", "startTime", "endTime", "status"],
        },
      ],
      order: [
        ["role", "ASC"], // host/admin dulu
        ["joinTime", "ASC"],
        ["created_at", "ASC"],
      ],
    });

    const transformedParticipants = participants.map((p) => {
      const name = p.displayName || p.User?.username || "Participant";
      return {
        id: p.participantId,
        userId: p.userId,
        name, // kompat lama
        displayName: name, // baru
        role:
          p.role === "host"
            ? "Host"
            : p.role === "admin"
            ? "Admin"
            : "Participant",
        seat: `Seat-${p.participantId.toString().padStart(2, "0")}`,
        mic: !!p.isAudioEnabled,
        cam: !!p.isVideoEnabled,
        hand: false,
        status: p.status,
        joinTime: p.joinTime,
        leaveTime: p.leaveTime,
        isScreenSharing: !!p.isScreenSharing,
      };
    });

    res.json({
      success: true,
      data: transformedParticipants,
      total: transformedParticipants.length,
      message: "Participants with status 'joined' loaded successfully",
    });
  } catch (error) {
    console.error("Error getting joined participants:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Simple test endpoint - return dummy data for testing
const getTestParticipants = async (req, res) => {
  try {
    // Try to get real data first, fallback to dummy data if no real data exists
    try {
      const realParticipants = await MeetingParticipant.findAll({
        where: {
          status: "joined",
          flag: "Y",
        },
        include: [
          {
            model: User,
            as: "User",
            attributes: ["id", "username"],
            include: [
              {
                model: UserRole,
                as: "UserRole",
                attributes: ["nama"],
              },
            ],
          },
        ],
        limit: 10,
      });

      if (realParticipants.length > 0) {
        // Transform real data
        const transformedParticipants = realParticipants.map((p) => ({
          id: p.participantId,
          userId: p.userId,
          name: p.User.username,
          role: p.role === "host" ? "Host" : "Participant",
          seat: `Seat-${p.participantId.toString().padStart(2, "0")}`,
          mic: p.isAudioEnabled,
          cam: p.isVideoEnabled,
          hand: false,
          status: p.status,
          joinTime: p.joinTime,
          leaveTime: p.leaveTime,
          isScreenSharing: p.isScreenSharing,
        }));

        return res.json({
          success: true,
          data: transformedParticipants,
          total: transformedParticipants.length,
          message: "Real participant data loaded from database",
        });
      }
    } catch (dbError) {
      console.log("Database query failed, using dummy data:", dbError.message);
    }

    // Fallback to dummy data if no real data exists
    const dummyParticipants = [
      {
        id: 1,
        userId: 1,
        name: "David Li",
        role: "Host",
        seat: "Seat-01",
        mic: true,
        cam: true,
        hand: false,
        status: "joined",
        joinTime: new Date(),
        leaveTime: null,
        isScreenSharing: false,
      },
      {
        id: 2,
        userId: 2,
        name: "Ayu Lestari",
        role: "Participant",
        seat: "Seat-02",
        mic: false,
        cam: true,
        hand: true,
        status: "joined",
        joinTime: new Date(),
        leaveTime: null,
        isScreenSharing: false,
      },
      {
        id: 3,
        userId: 3,
        name: "Hendra Simatupang",
        role: "Participant",
        seat: "Seat-03",
        mic: true,
        cam: false,
        hand: false,
        status: "joined",
        joinTime: new Date(),
        leaveTime: null,
        isScreenSharing: false,
      },
    ];

    res.json({
      success: true,
      data: dummyParticipants,
      total: dummyParticipants.length,
      message: "Using dummy data for testing (no real data found)",
    });
  } catch (error) {
    console.error("Error in test participants:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get basic info for debugging
const getBasicInfo = async (req, res) => {
  try {
    // Get basic counts
    const userCount = await User.count();
    const meetingCount = await Meeting.count();
    const participantCount = await MeetingParticipant.count();

    // Get participants by status
    const participantsByStatus = await MeetingParticipant.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("participantId")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    // Get first few users
    const users = await User.findAll({
      limit: 5,
      attributes: ["id", "username"],
      include: [
        {
          model: UserRole,
          as: "UserRole",
          attributes: ["nama"],
        },
      ],
    });

    // Get first few meetings
    const meetings = await Meeting.findAll({
      limit: 5,
      attributes: ["meetingId", "title", "status"],
    });

    // Get first few participants
    const participants = await MeetingParticipant.findAll({
      limit: 5,
      attributes: ["participantId", "meetingId", "userId", "role", "status"],
      include: [
        {
          model: User,
          as: "User",
          attributes: ["username"],
        },
        {
          model: Meeting,
          as: "Meeting",
          attributes: ["title"],
        },
      ],
    });

    res.json({
      success: true,
      data: {
        counts: {
          users: userCount,
          meetings: meetingCount,
          participants: participantCount,
        },
        participantsByStatus: participantsByStatus,
        users: users,
        meetings: meetings,
        participants: participants,
      },
    });
  } catch (error) {
    console.error("Error getting basic info:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getMeetingParticipants = async (req, res) => {
  try {
    const { meetingId } = req.params;
    if (!meetingId) {
      return res
        .status(400)
        .json({ success: false, message: "Meeting ID is required" });
    }

    const participants = await MeetingParticipant.findAll({
      where: { meetingId, flag: "Y" },
      include: [
        {
          model: User,
          as: "User",
          attributes: ["id", "username"],
          include: [{ model: UserRole, as: "UserRole", attributes: ["nama"] }],
        },
        {
          model: Meeting,
          as: "Meeting",
          attributes: ["title", "startTime", "endTime", "status"],
        },
      ],
      order: [
        ["role", "ASC"],
        ["joinTime", "ASC"],
        ["created_at", "ASC"],
      ],
    });

    const transformedParticipants = participants.map((p) => {
      const name = p.displayName || p.User?.username || "Participant";
      return {
        id: p.participantId,
        userId: p.userId,
        name, // kompat
        displayName: name, // baru
        role:
          p.role === "host"
            ? "Host"
            : p.role === "admin"
            ? "Admin"
            : "Participant",
        seat: `Seat-${p.participantId.toString().padStart(2, "0")}`,
        mic: !!p.isAudioEnabled,
        cam: !!p.isVideoEnabled,
        hand: false,
        status: p.status,
        joinTime: p.joinTime,
        leaveTime: p.leaveTime,
        isScreenSharing: !!p.isScreenSharing,
      };
    });

    res.json({
      success: true,
      data: transformedParticipants,
      total: transformedParticipants.length,
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

// Get all participants for current user's meetings
const getMyMeetingParticipants = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Get meetings where user is a participant
    const myMeetings = await MeetingParticipant.findAll({
      where: {
        userId: userId,
        flag: "Y",
      },
      include: [
        {
          model: Meeting,
          as: "Meeting",
          where: {
            flag: "Y",
            status: {
              [Op.in]: ["started", "scheduled"],
            },
          },
          attributes: ["meetingId", "title", "startTime", "endTime", "status"],
        },
      ],
    });

    if (myMeetings.length === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0,
      });
    }

    // Get the first active meeting (you might want to modify this logic)
    const currentMeeting = myMeetings[0].Meeting;

    // Get all participants for this meeting
    const participants = await MeetingParticipant.findAll({
      where: {
        meetingId: currentMeeting.meetingId,
        flag: "Y",
      },
      include: [
        {
          model: User,
          as: "User",
          attributes: ["id", "username"],
          include: [
            {
              model: UserRole,
              as: "UserRole",
              attributes: ["nama"],
            },
          ],
        },
      ],
      order: [
        ["role", "ASC"],
        ["created_at", "ASC"],
      ],
    });

    // Transform data to match frontend format
    const transformedParticipants = participants.map((p) => ({
      id: p.participantId,
      userId: p.userId,
      name: p.User.username,
      role: p.role === "host" ? "Host" : "Participant",
      seat: `Seat-${p.participantId.toString().padStart(2, "0")}`,
      mic: p.isAudioEnabled,
      cam: p.isVideoEnabled,
      hand: false,
      status: p.status,
      joinTime: p.joinTime,
      leaveTime: p.leaveTime,
      isScreenSharing: p.isScreenSharing,
    }));

    res.json({
      success: true,
      data: transformedParticipants,
      total: transformedParticipants.length,
      currentMeeting: {
        id: currentMeeting.meetingId,
        title: currentMeeting.title,
        status: currentMeeting.status,
      },
    });
  } catch (error) {
    console.error("Error getting my meeting participants:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Add participant to a meeting
const addParticipantToMeeting = async (req, res) => {
  try {
    const { meetingId, userId, role = "participant", displayName } = req.body;

    if (!meetingId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Meeting ID and User ID are required",
      });
    }

    const finalName = await pickDisplayName({
      req,
      explicit: displayName,
      userId,
      models: { User },
    });

    // Check if participant already exists
    const existingParticipant = await MeetingParticipant.findOne({
      where: {
        meetingId: meetingId,
        userId: userId,
        flag: "Y",
      },
    });

    if (existingParticipant) {
      return res.status(400).json({
        success: false,
        message: "Participant already exists in this meeting",
      });
    }

    // Create new participant
    const newParticipant = await MeetingParticipant.create({
      meetingId: meetingId,
      userId: userId,
      role: role,
      status: "scheduled",
      isAudioEnabled: true,
      displayName: finalName,
      isVideoEnabled: true,
      isScreenSharing: false,
      flag: "Y",
    });

    res.json({
      success: true,
      message: "Participant added successfully",
      data: newParticipant,
    });
  } catch (error) {
    console.error("Error adding participant to meeting:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update participant status (mic, camera, etc.)
const updateParticipantStatus = async (req, res) => {
  try {
    const { participantId } = req.params;
    const { isAudioEnabled, isVideoEnabled, isScreenSharing } = req.body;

    const participant = await MeetingParticipant.findByPk(participantId);

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

    // Update fields
    if (isAudioEnabled !== undefined)
      participant.isAudioEnabled = isAudioEnabled;
    if (isVideoEnabled !== undefined)
      participant.isVideoEnabled = isVideoEnabled;
    if (isScreenSharing !== undefined)
      participant.isScreenSharing = isScreenSharing;

    await participant.save();

    res.json({
      success: true,
      message: "Participant status updated successfully",
      data: participant,
    });
  } catch (error) {
    console.error("Error updating participant status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

function normalizeDisplayName(s) {
  return (s ?? "").toString().trim().replace(/\s+/g, " ").slice(0, 100);
}

const setParticipantDisplayName = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { meetingId, displayName } = req.body;

    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Unauthenticated" });
    if (!meetingId)
      return res
        .status(400)
        .json({ success: false, message: "meetingId is required" });

    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting)
      return res
        .status(404)
        .json({ success: false, message: "Meeting not found" });

    const safeName = normalizeDisplayName(displayName);

    // upsert participant untuk user saat ini
    const [mp, created] = await MeetingParticipant.findOrCreate({
      where: { meetingId, userId, flag: "Y" },
      defaults: {
        role: "participant",
        status: "joined",
        joinTime: new Date(),
        displayName: safeName || "Participant", // jangan kosong (kolom NOT NULL)
        isAudioEnabled: true,
        isVideoEnabled: true,
        isScreenSharing: false,
        flag: "Y",
      },
    });

    if (!created && mp.displayName !== safeName && safeName) {
      await mp.update({ displayName: safeName });
    }

    return res.json({
      success: true,
      message: created ? "Name saved (participant created)" : "Name updated",
      data: {
        participantId: mp.participantId,
        meetingId,
        userId,
        displayName: safeName || mp.displayName,
      },
    });
  } catch (err) {
    console.error("setParticipantDisplayName error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

const getParticipantsWithNames = async (req, res) => {
  try {
    const { meetingId } = req.query;
    if (!meetingId)
      return res
        .status(400)
        .json({ success: false, message: "meetingId is required" });

    const rows = await MeetingParticipant.findAll({
      where: { meetingId, flag: "Y" },
      include: [{ model: User, as: "User", attributes: ["id", "username"] }],
      order: [
        ["joinTime", "ASC"],
        ["created_at", "ASC"],
      ],
    });

    const data = rows.map((p) => ({
      id: p.participantId,
      userId: p.userId,
      displayName: p.displayName,
      role: p.role,
      status: p.status,
      mic: !!p.isAudioEnabled,
      cam: !!p.isVideoEnabled,
      isScreenSharing: !!p.isScreenSharing,
      joinTime: p.joinTime,
      usernameFallback: p.User?.username || null,
    }));

    return res.json({ success: true, data, total: data.length });
  } catch (err) {
    console.error("getParticipantsWithNames error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

module.exports = {
  getTestParticipants,
  getBasicInfo,
  getMeetingParticipants,
  getMyMeetingParticipants,
  addParticipantToMeeting,
  updateParticipantStatus,
  getJoinedParticipants,
  setParticipantDisplayName,
  getParticipantsWithNames,
};
