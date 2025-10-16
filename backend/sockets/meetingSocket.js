const { verifyToken } = require("../utils/jwt");

module.exports = function setupMeetingSocket(socket, io, models, validateMeetingStatus, broadcastToMeeting, roomName) {
  (async () => {
    try {
      const q = socket.handshake.query || {};
      const token = q.token;
      const meetingId = q.meetingId;

      console.log("🧩 [meetingSocket] New connection:", socket.id, q);

      if (!token || !meetingId) {
        console.log("❌ Missing token or meetingId:", { token, meetingId });
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

      // ===== DUPLICATE CONNECTION CHECK =====
      for (const [sid, s] of io.sockets.sockets) {
        if (s.data?.userId === String(payload.id) && sid !== socket.id) {
          console.log(`⚠️ Duplicate connection for user ${payload.username}, closing old socket`);
          s.disconnect(true);
        }
      }

      // ===== INIT DATA =====
      socket.authUserId = String(payload.id); // ✅ penting!
      socket.data = {
        userId: String(payload.id),
        displayName: null,
        meetingId: String(meetingId),
      };

      const isValid = await validateMeetingStatus(meetingId);
      console.log("✅ Meeting validation:", meetingId, "=>", isValid);
      if (!isValid) {
        socket.emit("error", { code: 4403, message: "Meeting invalid" });
        return socket.disconnect(true);
      }

      await socket.join(roomName(meetingId));
      console.log(`✅ ${payload.username} connected & joined room ${meetingId}, waiting for join-room event`);

      // ===== UNIVERSAL MESSAGE HANDLER =====
      socket.on("message", async (message) => {
        try {
          const data = typeof message === "string" ? JSON.parse(message) : message;

          switch (data.type) {
            // ✅ JOIN MEETING (client)
            case "join-room": {
  const { meetingId, displayName } = data;
  if (!meetingId) return;

  // Pakai ID dari JWT payload (bukan dari data.userId)
  socket.data.meetingId = String(meetingId);
  socket.data.userId = String(payload.id);
  socket.data.displayName = displayName || payload.username;
    socket.authUserId = String(payload.id); // ✅ tambahkan ini!


  console.log(`✅ join-room: ${socket.data.displayName} (${socket.data.userId}) joined meeting ${meetingId}`);

  // Kumpulkan peserta lain
  const others = [];
  for (const [sid, s] of io.sockets.sockets) {
    if (s.data.meetingId === String(meetingId) && sid !== socket.id) {
      others.push({
        participantId: s.data.userId,
        displayName: s.data.displayName,
      });
    }
  }

  // Kirim list peserta ke user baru
  socket.emit("message", { type: "participants_list", data: others });

  // Broadcast ke peserta lain
  socket.to(roomName(meetingId)).emit("message", {
    type: "participant_joined",
    participantId: socket.data.userId,
    displayName: socket.data.displayName,
    joinedAt: Date.now(),
  });

  break;
}



            case "meeting-end": {
              broadcastToMeeting(meetingId, {
                type: "meeting-ended",
                userId: data.userId,
                username: data.username,
                meetingId,
                timestamp: new Date().toISOString(),
              });
              break;
            }

            case "leave-room": {
  const { meetingId, userId, displayName } = data;
  const uid = socket.data?.userId || userId; // ✅ pastikan ambil dari data socket
  if (!meetingId || !uid) {
    console.warn("⚠️ leave-room missing meetingId/userId", data);
    return;
  }

  console.log(`👋 [manual leave] ${displayName || uid} left meeting ${meetingId}`);

  socket.to(roomName(meetingId)).emit("message", {
    type: "participant_left",
    participantId: String(uid), // ✅ perbaiki ke uid
    displayName: displayName || "Unknown",
    leftAt: Date.now(),
  });

  socket.disconnect(true);
  break;
}



            default:
              console.log("ℹ️ Unhandled message type:", data.type);
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

  

// ===== HANDLE DISCONNECT =====
socket.on("disconnect", async (reason) => {
const uid = socket.data?.userId;
  const { meetingId, displayName } = socket.data || {};

  console.log("⚡ DISCONNECT DEBUG:", {
    socketId: socket.id,
    uid,
    meetingId,
    displayName,
    reason,
  });

  // kalau tidak ada id / meeting, log dulu biar tahu kenapa skip
  if (!meetingId || !uid) {
    console.log("❌ Skip disconnect: missing meetingId or uid");
    return;
  }

  // tunggu sebentar (biar koneksi rejoin sempat kebaca)
  await new Promise((res) => setTimeout(res, 500));

  const stillConnected = Array.from(io.sockets.sockets.values()).some(
    (s) =>
      s.id !== socket.id &&
      s.authUserId === uid &&
      s.data?.meetingId === String(meetingId)
  );

  if (stillConnected) {
    console.log(`⏩ Skip broadcast leave for ${displayName || uid}, user reconnected`);
    return;
  }

  console.log(`👋 ${displayName || "Unknown"} (${uid}) left meeting ${meetingId}, reason: ${reason}`);

  socket.to(roomName(meetingId)).emit("message", {
    type: "participant_left",
    participantId: uid,
    displayName: displayName || "Unknown",
    leftAt: Date.now(),
  });
});



};
