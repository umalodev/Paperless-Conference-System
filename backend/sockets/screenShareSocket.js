module.exports = function setupScreenShareSocket(socket, io) {
  socket.on("message", (raw) => {
    try {
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      const { type, meetingId, userId, displayName, role } = data || {};
      if (!type || !meetingId) return;

      switch (type) {
        case "screen-share-start":
          console.log(`🟢 [ShareScreen] ${displayName || userId} started sharing in ${meetingId}`);

          socket.data.isSharingScreen = true;
          socket.data.meetingId = meetingId;
          socket.data.userId = userId;
          socket.data.displayName = displayName || `User ${userId}`;
          socket.data.role = role || "Participant";

          // broadcast ke semua peserta
          io.to(`meeting:${meetingId}`).emit("message", {
            ...data,
            displayName: displayName || `User ${userId}`,
            role: role || "Participant",
          });
          break;

        case "screen-share-stream":
          io.to(`meeting:${meetingId}`).emit("message", data);
          break;

        case "screen-share-stop":
          console.log(`🔴 [ShareScreen] ${displayName || userId} stopped sharing in ${meetingId}`);
          socket.data.isSharingScreen = false;
          io.to(`meeting:${meetingId}`).emit("message", {
            ...data,
            displayName: displayName || socket.data.displayName || `User ${userId}`,
            role: role || socket.data.role || "Participant",
          });
          break;

        default:
          console.log(`ℹ️ Unhandled message type: ${type}`);
          break;
      }
    } catch (err) {
      console.error("❌ Error in screenShareSocket handler:", err);
    }
  });

  // 🔹 Saat user disconnect → auto-stop share screen
  socket.on("disconnect", (reason) => {
    const { isSharingScreen, meetingId, userId, displayName, role } = socket.data || {};
    if (isSharingScreen && meetingId && userId) {
      console.log(
        `⚠️ [AutoStop] ${displayName || userId} disconnected (${reason}), stopping share`
      );

      io.to(`meeting:${meetingId}`).emit("message", {
        type: "screen-share-stopped",
        userId,
        meetingId,
        displayName: displayName || `User ${userId}`,
        role: role || "Participant",
        timestamp: Date.now(),
        reason: "disconnect",
      });
    }
  });
};
