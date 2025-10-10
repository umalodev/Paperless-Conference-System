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
        const wss = require("../index").getWebSocketServer();
        if (wss) {
          const meetingIdStr = String(meetingId);
          const senderIdStr = String(userId);
          const receiverIdStr =
            userReceiveId != null ? String(userReceiveId) : null;
          wss.clients.forEach((client) => {
            if (
              client.readyState === 1 &&
              String(client.meetingId) === meetingIdStr
            ) {
              // For private chat, only send to sender and receiver
              if (userReceiveId) {
                if (
                  client.userId === userId ||
                  client.userId === userReceiveId
                ) {
                  const cid = String(client.userId || "");
                  if (cid === senderIdStr || cid === receiverIdStr) {
                    client.send(
                      JSON.stringify({
                        type: "chat_message",
                        messageId: messageWithUser.meetingChatId,
                        userId: messageWithUser.userId,
                        username: messageWithUser.Sender.username,
                        message: messageWithUser.textMessage,
                        messageType: messageWithUser.messageType,
                        timestamp: new Date(messageWithUser.sendTime).getTime(),
                        userReceiveId: messageWithUser.userReceiveId,
                        meetingId: meetingId,
                      })
                    );
                  }
                }
              } else {
                // For global chat, send to all participants
                client.send(
                  JSON.stringify({
                    type: "chat_message",
                    messageId: messageWithUser.meetingChatId,
                    userId: messageWithUser.userId,
                    username: messageWithUser.Sender.username,
                    message: messageWithUser.textMessage,
                    messageType: messageWithUser.messageType,
                    timestamp: new Date(messageWithUser.sendTime).getTime(),
                    meetingId: meetingId,
                  })
                );
              }
            }
          });
        }
      } catch (wsError) {
        console.error("WebSocket broadcast error:", wsError);
        // Don't fail the request if WebSocket fails
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

  // Upload file for chat

  static async uploadFile(req, res) {
    try {
      const { meetingId } = req.params;
      const { userReceiveId } = req.body;
      const userId = req.user.id;

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "File tidak ditemukan" });
      }

      // validasi participant (sudah ada, biarkan)

      // Tentukan tipe
      let messageType = "file";
      if ((req.file.mimetype || "").startsWith("image/")) messageType = "image";

      // Dukung dua mode multer:
      // - diskStorage => req.file.path ada, req.file.buffer tidak ada
      // - memoryStorage => req.file.buffer ada, req.file.path tidak ada
      const fileBuffer = req.file.buffer || null;
      // Pastikan filePath absolut bila ada
      const filePath = req.file.path ? path.resolve(req.file.path) : null;

      // **PENTING**: Jangan isi field yang tidak ada. Minimal salah satu harus ada.
      if (!fileBuffer && !filePath) {
        return res.status(500).json({
          success: false,
          message:
            "Konfigurasi upload tidak valid: tidak ada buffer maupun path.",
        });
      }

      const payload = {
        meetingId,
        userId,
        userReceiveId: userReceiveId || null,
        textMessage: null,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        messageType,
        flag: "Y",
      };

      if (fileBuffer) payload.fileMessage = fileBuffer; // memoryStorage
      const relativePath = path.join(
        "uploads",
        "materials",
        meetingId.toString(),
        req.file.filename
      );
      payload.filePath = relativePath;

      const chatMessage = await MeetingChat.create(payload);

      const messageWithUser = await MeetingChat.findByPk(
        chatMessage.meetingChatId,
        {
          include: [
            { model: User, as: "Sender", attributes: ["id", "username"] },
            {
              model: User,
              as: "Receiver",
              attributes: ["id", "username"],
              required: false,
            },
          ],
        }
      );

      // --- Broadcast (dengan normalisasi tipe id) ---
      try {
        const wss = require("../index").getWebSocketServer();
        if (wss) {
          const meetingIdStr = String(meetingId);
          const senderIdStr = String(userId);
          const receiverIdStr =
            userReceiveId != null ? String(userReceiveId) : null;

          wss.clients.forEach((client) => {
            if (client.readyState !== 1) return; // WebSocket.OPEN
            if (String(client.meetingId) !== meetingIdStr) return;

            if (receiverIdStr) {
              const cid = String(client.userId || "");
              if (cid !== senderIdStr && cid !== receiverIdStr) return;
            }

            client.send(
              JSON.stringify({
                type: "chat_message",
                messageId: messageWithUser.meetingChatId,
                userId: messageWithUser.userId,
                username: messageWithUser.Sender?.username,
                message: messageWithUser.textMessage || "",
                messageType: messageWithUser.messageType,
                timestamp: new Date(messageWithUser.sendTime).getTime(),
                filePath: messageWithUser.filePath,
                originalName: messageWithUser.originalName,
                mimeType: messageWithUser.mimeType,
                userReceiveId: messageWithUser.userReceiveId,
                meetingId,
              })
            );
          });
        }
      } catch (wsError) {
        console.error("WebSocket broadcast error:", wsError);
      }

      res.json({
        success: true,
        data: messageWithUser,
        message: "File berhasil diupload",
      });
    } catch (error) {
      console.error("Error uploading file:", error?.stack || error);
      res
        .status(500)
        .json({ success: false, message: "Gagal mengupload file" });
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
