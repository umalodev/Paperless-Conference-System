// meetingSocket.js
const { verifyToken } = require("../utils/jwt");

module.exports = function setupMeetingSocket(
  socket,
  io,
  models,
  validateMeetingStatus,
  broadcastToMeeting,
  roomName
) {
  (async () => {
    try {
      const q = socket.handshake.query || {};
      const token = q.token;
      const meetingId = q.meetingId;
      const queryUserId = q.userId;

      console.log("🧩 [meetingSocket] New connection:", socket.id, q);

      if (!token || !meetingId) {
        socket.emit("error", { code: 4001, message: "Missing token or meetingId" });
        return socket.disconnect(true);
      }

      // ===== AUTH JWT =====
      let payload;
      try {
        payload = verifyToken(token);
      } catch (err) {
        console.error("❌ Token verification failed:", err.message);
        socket.emit("error", { code: 4401, message: "Unauthorized" });
        return socket.disconnect(true);
      }

      const effectiveUserId = String(queryUserId || payload.id);
      socket.authUserId = effectiveUserId;
      socket.data = {
        userId: effectiveUserId,
        displayName: null,
        meetingId: String(meetingId),
        hasLeftManually: false,
      };

      console.log(`🆔 Effective userId: ${effectiveUserId} (query=${queryUserId}, token=${payload.id})`);

      // ===== VALIDATE MEETING =====
      const isValid = await validateMeetingStatus(meetingId);
      if (!isValid) {
        socket.emit("error", { code: 4403, message: "Meeting invalid" });
        return socket.disconnect(true);
      }

      await socket.join(roomName(meetingId));
      console.log(`✅ User ${effectiveUserId} joined room ${meetingId}, waiting for join-room event`);

      // ===== MESSAGE HANDLER =====
      socket.on("message", async (message) => {
        try {
          const data = typeof message === "string" ? JSON.parse(message) : message;
          const { type } = data || {};

          switch (type) {
            // --------------------------------------------------
            // ✅ JOIN ROOM
            // --------------------------------------------------
            case "join-room": {

              
              const { meetingId, displayName } = data;
              const userId = socket.data.userId;
              const room = roomName(meetingId);

              socket.data.displayName = displayName || payload.username || `User-${userId}`;
              socket.authUserId = userId;

              // 🔍 Cegah double broadcast kalau user sudah join
              const alreadyJoined = Array.from(io.sockets.sockets.values()).some(
                (s) =>
                  s.id !== socket.id &&
                  s.data?.userId === String(userId) &&
                  s.data?.meetingId === String(meetingId)
              );

              if (alreadyJoined) {
                console.log(`⚠️ Skip broadcast join for ${displayName || userId}, already joined`);
              } else {
                console.log(`✅ join-room: ${socket.data.displayName} (${userId}) joined meeting ${meetingId}`);

                // Broadcast ke peserta lain
                socket.to(room).emit("message", {
                  type: "participant_joined",
                  participantId: userId,
                  displayName: socket.data.displayName,
                  joinedAt: Date.now(),
                });
              }

              // Kirim daftar peserta ke user baru
              const others = [];
              for (const [sid, s] of io.sockets.sockets) {
                if (s.data.meetingId === String(meetingId) && sid !== socket.id) {
                  others.push({
                    participantId: s.data.userId,
                    displayName: s.data.displayName,
                  });
                }
              }
              socket.emit("message", { type: "participants_list", data: others });
              break;
            }

            // --------------------------------------------------
            // ✅ LEAVE ROOM (manual)
            // --------------------------------------------------
            case "leave-room": {
              const { meetingId, displayName } = data;
              const uid = socket.data.userId;
              if (!meetingId || !uid) return;

              console.log(`👋 [manual leave] ${displayName || uid} left meeting ${meetingId}`);

              // tandai manual leave SEBELUM broadcast
              socket.data.hasLeftManually = true;

              // 🔥 kirim notifikasi ke semua peserta lain
              io.to(roomName(meetingId)).emit("message", {
                type: "participant_left",
                userId: uid, // ✅ gunakan userId konsisten
                displayName: displayName || socket.data.displayName || "Unknown",
                leftAt: Date.now(),
              });

              // 🚪 tutup koneksi setelah broadcast manual
              socket.leave(roomName(meetingId));
              socket.disconnect(true);
              break;
            }


            // --------------------------------------------------
            // ✅ MEETING END (host)
            // --------------------------------------------------
            case "meeting-end": {
              broadcastToMeeting(meetingId, {
                type: "meeting-ended",
                userId: socket.data.userId,
                username: socket.data.displayName,
                meetingId,
                timestamp: new Date().toISOString(),
              });
              break;
            }

            default:
              console.log("ℹ️ Unhandled message type:", type);
          }
        } catch (err) {
          console.error("❌ Error in meetingSocket handler:", err);
        }
      });
    } catch (err) {
      console.error("❌ MeetingSocket init error:", err);
      socket.disconnect(true);
    }
  })();

  // --------------------------------------------------
  // ✅ HANDLE DISCONNECT
  // --------------------------------------------------
  socket.on("disconnect", async (reason) => {
    const uid = socket.data?.userId;
    const { meetingId, displayName, hasLeftManually } = socket.data || {};
    if (!meetingId || !uid) return;

    if (hasLeftManually) {
      console.log(`⏩ Skip disconnect broadcast for ${uid}, left manually`);
      return;
    }

    // beri sedikit delay agar socket baru sempat connect
    await new Promise((r) => setTimeout(r, 400));

    const stillActive = Array.from(io.sockets.sockets.values()).some(
      (s) =>
        s.id !== socket.id &&
        s.data?.meetingId === String(meetingId) &&
        s.data?.userId === String(uid)
    );

    if (stillActive) {
      console.log(`⏩ Skip broadcast leave for ${displayName || uid}, still active`);
      return;
    }

    console.log(`👋 [disconnect] ${displayName || "Unknown"} (${uid}) left meeting ${meetingId}, reason: ${reason}`);

    io.to(roomName(meetingId)).emit("message", {
      type: "participant_left",
      userId: uid, // ✅ konsisten
      displayName: displayName || "Unknown",
      leftAt: Date.now(),
    });
  });

};
