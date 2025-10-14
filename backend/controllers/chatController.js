const { MeetingChat, Meeting, User, MeetingParticipant } = require("../models");
const { Op } = require("sequelize");
const path = require("path");

class ChatController {
  // Get chat messages for a meeting
  static async getChatMessages(req, res) {
    try {
      const { meetingId } = req.params;
      const { page = 1, limit = 50, lastMessageId } = req.query;
      const userId = req.user.id;

      // Verify user is participant of the meeting
      const participant = await MeetingParticipant.findOne({
        where: {
          meetingId: meetingId,
          userId: userId,
          flag: "Y",
        },
      });

      if (!participant) {
        return res.status(403).json({
          success: false,
          message: "Anda bukan peserta meeting ini",
        });
      }

      // Build where condition for pagination
      let whereCondition = {
        meetingId: meetingId,
        flag: "Y",
      };

      // Add userReceiveId filter for private chat
      const { userReceiveId } = req.query;
      if (userReceiveId) {
        // For private chat, get messages where current user is sender and userReceiveId is receiver, or vice versa
        whereCondition[Op.or] = [
          { userId: userId, userReceiveId: userReceiveId },
          { userId: userReceiveId, userReceiveId: userId },
        ];
      } else {
        // For global chat, get messages where userReceiveId is null
        whereCondition.userReceiveId = null;
      }

      // If lastMessageId is provided, get messages after that ID
      if (lastMessageId) {
        whereCondition.meetingChatId = {
          [Op.gt]: lastMessageId,
        };
      }

      // Get messages with pagination
      const offset = (page - 1) * limit;
      const messages = await MeetingChat.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: User,
            as: "Sender",
            attributes: ["id", "username"],
          },
          {
            model: User,
            as: "Receiver",
            attributes: ["id", "username"],
            required: false,
          },
        ],
        order: [["sendTime", "DESC"]],
        limit: parseInt(limit),
        offset: offset,
      });

      // Reverse order to show oldest first
      messages.rows.reverse();

      res.json({
        success: true,
        data: {
          messages: messages.rows,
          totalCount: messages.count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(messages.count / limit),
          hasMore: offset + messages.rows.length < messages.count,
        },
      });
    } catch (error) {
      console.error("Error getting chat messages:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil pesan chat",
      });
    }
  }

  // Send a text message
  static async sendMessage(req, res) {
    try {
      const { meetingId } = req.params;
      const { textMessage, userReceiveId } = req.body;
      const userId = req.user.id;

      // Verify user is participant of the meeting
      const participant = await MeetingParticipant.findOne({
        where: {
          meetingId: meetingId,
          userId: userId,
          flag: "Y",
        },
      });

      if (!participant) {
        return res.status(403).json({
          success: false,
          message: "Anda bukan peserta meeting ini",
        });
      }

      // If userReceiveId is provided, verify the receiver is also participant
      if (userReceiveId) {
        const receiverParticipant = await MeetingParticipant.findOne({
          where: {
            meetingId: meetingId,
            userId: userReceiveId,
            flag: "Y",
          },
        });

        if (!receiverParticipant) {
          return res.status(400).json({
            success: false,
            message: "Penerima bukan peserta meeting ini",
          });
        }
      }

      // Create chat message
      const chatMessage = await MeetingChat.create({
        meetingId: meetingId,
        userId: userId,
        userReceiveId: userReceiveId || null,
        textMessage: textMessage,
        messageType: "text",
      });

      // Get the created message with user info
      const messageWithUser = await MeetingChat.findByPk(
        chatMessage.meetingChatId,
        {
          include: [
            {
              model: User,
              as: "Sender",
              attributes: ["id", "username"],
            },
            {
              model: User,
              as: "Receiver",
              attributes: ["id", "username"],
              required: false,
            },
          ],
        }
      );

      // Broadcast message via WebSocket
      try {
        const io = require("../index").getWebSocketServer(); // Socket.IO instance
        if (io) {
          const payload = {
            type: "chat_message",
            messageId: messageWithUser.meetingChatId,
            userId: messageWithUser.userId,
            username: messageWithUser.Sender.username,
            message: messageWithUser.textMessage,
            messageType: messageWithUser.messageType,
            timestamp: new Date(messageWithUser.sendTime).getTime(),
            userReceiveId: messageWithUser.userReceiveId,
            meetingId,
          };

          if (userReceiveId) {
            // 🔸 Chat private → hanya kirim ke pengirim & penerima
            io.to(`meeting:${meetingId}`)
              .fetchSockets()
              .then((sockets) => {
                sockets.forEach((s) => {
                  const uid = String(s.data?.user?.id || s.data?.userId);
                  if (uid === String(userId) || uid === String(userReceiveId)) {
                    s.emit("message", payload);
                  }
                });
              });
          } else {
            // 🔸 Chat global → kirim ke semua peserta room
            io.to(`meeting:${meetingId}`).emit("message", payload);
          }
        }
      } catch (err) {
        console.error("Socket.IO broadcast error:", err);
      }


      res.json({
        success: true,
        data: messageWithUser,
        message: "Pesan berhasil dikirim",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengirim pesan",
      });
    }
  }


// controllers/chatController.js
static async uploadFile(req, res) {
  try {
    const { meetingId } = req.params;
    const { userReceiveId } = req.body;
    const userId = req.user.id;

    if (!req.file)
      return res.status(400).json({ success: false, message: "File tidak ditemukan" });

    // Tentukan tipe file
    let messageType = "file";
    if ((req.file.mimetype || "").startsWith("image/")) messageType = "image";

    const relativePath = path.join(
      "uploads",
      "materials",
      meetingId.toString(),
      req.file.filename
    );

    const chatMessage = await MeetingChat.create({
      meetingId,
      userId,
      userReceiveId: userReceiveId || null,
      filePath: relativePath,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      messageType,
      flag: "Y",
    });

    const messageWithUser = await MeetingChat.findByPk(chatMessage.meetingChatId, {
      include: [
        { model: User, as: "Sender", attributes: ["id", "username"] },
        { model: User, as: "Receiver", attributes: ["id", "username"], required: false },
      ],
    });

    // 🔹 Payload realtime
    const payload = {
      type: "chat_message",
      messageId: messageWithUser.meetingChatId,
      userId: messageWithUser.userId,
      username: messageWithUser.Sender?.username,
      message: "",
      messageType: messageWithUser.messageType,
      timestamp: new Date(messageWithUser.sendTime).getTime(),
      filePath: messageWithUser.filePath,
      originalName: messageWithUser.originalName,
      mimeType: messageWithUser.mimeType,
      userReceiveId: messageWithUser.userReceiveId,
      meetingId,
    };

    // 🔹 Ambil instance io
    const io = require("../index").getWebSocketServer();
    if (io) {
      if (userReceiveId) {
        // private message → kirim hanya ke sender & receiver
        io.to(`meeting:${meetingId}`)
          .fetchSockets()
          .then((sockets) => {
            sockets.forEach((s) => {
              const uid = String(s.data?.user?.id || s.data?.userId);
              if (uid === String(userId) || uid === String(userReceiveId)) {
                s.emit("message", payload);
              }
            });
          });
      } else {
        // 🔸 global chat → broadcast ke semua peserta meeting
        io.to(`meeting:${meetingId}`).emit("message", payload);
      }
    }

    res.json({ success: true, data: messageWithUser, message: "File berhasil diupload" });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ success: false, message: "Gagal mengupload file" });
  }
}



  // Download file from chat
  static async downloadFile(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;

      // Get the message
      const message = await MeetingChat.findByPk(messageId, {
        include: [
          {
            model: Meeting,
            as: "Meeting",
            include: [
              {
                model: MeetingParticipant,
                as: "Participants",
                where: {
                  userId: userId,
                  flag: "Y",
                },
                required: true,
              },
            ],
          },
        ],
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Pesan tidak ditemukan",
        });
      }

      if (!message.fileMessage && !message.filePath) {
        return res.status(400).json({
          success: false,
          message: "File tidak tersedia",
        });
      }

      // Set headers for file download
      res.setHeader(
        "Content-Type",
        message.mimeType || "application/octet-stream"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${message.originalName}"`
      );

      // Send file
      if (message.fileMessage) {
        res.send(message.fileMessage);
      } else if (message.filePath) {
        res.sendFile(require("path").resolve(message.filePath));
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengunduh file",
      });
    }
  }

  // Get participants for private chat
  static async getParticipants(req, res) {
    try {
      const { meetingId } = req.params;
      const userId = req.user.id;

      console.log(
        "Getting participants for meeting:",
        meetingId,
        "user:",
        userId
      );

      // Check if user is participant of this meeting
      const isParticipant = await MeetingParticipant.findOne({
        where: {
          meetingId: meetingId,
          userId: userId,
          flag: "Y",
        },
      });

      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: "Anda bukan peserta meeting ini",
        });
      }

      // Get all participants of this meeting (using same logic as participantController)
      const participants = await MeetingParticipant.findAll({
        where: {
          meetingId: meetingId,
          flag: "Y",
        },
        include: [
          {
            model: User,
            as: "User",
            attributes: ["id", "username"],
            include: [
              {
                model: require("../models").UserRole,
                as: "UserRole",
                attributes: ["nama"],
              },
            ],
          },
          {
            model: Meeting,
            as: "Meeting",
            attributes: ["title", "startTime", "endTime", "status"],
          },
        ],
        order: [
          ["role", "ASC"], // Host first, then participants
          ["created_at", "ASC"],
        ],
      });

      console.log("Found participants:", participants.length);
      participants.forEach((p) => {
        console.log(
          `- Participant: ${p.User?.username} (ID: ${p.User?.id}), Role: ${p.role}, Status: ${p.status}`
        );
      });

      // Transform data to match frontend format (same as participantController)
      const transformedParticipants = participants.map((p) => ({
        id: p.participantId,
        userId: p.userId,
        name: p.User.username,
        role: p.role === "host" ? "Host" : "Participant",
        seat: `Seat-${p.participantId.toString().padStart(2, "0")}`, // Generate seat number
        mic: p.isAudioEnabled,
        cam: p.isVideoEnabled,
        hand: false, // This would need to be tracked separately
        status: p.status,
        joinTime: p.joinTime,
        leaveTime: p.leaveTime,
        isScreenSharing: p.isScreenSharing,
      }));

      res.json({
        success: true,
        data: transformedParticipants,
        total: transformedParticipants.length,
        message: "Participants berhasil diambil",
      });
    } catch (error) {
      console.error("Error getting participants:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil participants",
        error: error.message,
      });
    }
  }

  // Delete message (soft delete)
  static async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;

      // Get the message
      const message = await MeetingChat.findByPk(messageId);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Pesan tidak ditemukan",
        });
      }

      // Check if user is the sender or has admin privileges
      if (message.userId !== userId) {
        // TODO: Add admin role check here
        return res.status(403).json({
          success: false,
          message: "Anda tidak memiliki izin untuk menghapus pesan ini",
        });
      }

      // Soft delete
      await message.update({ flag: "N" });

      res.json({
        success: true,
        message: "Pesan berhasil dihapus",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menghapus pesan",
      });
    }
  }

  // Get chat participants
  static async getChatParticipants(req, res) {
    try {
      const { meetingId } = req.params;
      const userId = req.user.id;

      // Verify user is participant of the meeting
      const participant = await MeetingParticipant.findOne({
        where: {
          meetingId: meetingId,
          userId: userId,
          flag: "Y",
        },
      });

      if (!participant) {
        return res.status(403).json({
          success: false,
          message: "Anda bukan peserta meeting ini",
        });
      }

      // Get all participants
      const participants = await MeetingParticipant.findAll({
        where: {
          meetingId: meetingId,
          flag: "Y",
        },
        include: [
          {
            model: User,
            as: "User",
            attributes: ["id", "username"],
          },
        ],
        order: [["created_at", "ASC"]],
      });

      res.json({
        success: true,
        data: participants,
      });
    } catch (error) {
      console.error("Error getting chat participants:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil daftar peserta",
      });
    }
  }
}

module.exports = ChatController;
