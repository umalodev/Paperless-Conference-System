// socket/screenShareSocket.js
module.exports = function setupScreenShareSocket(socket, io) {
  socket.on("message", (raw) => {
    try {
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      const { type, meetingId, userId, streamData } = data || {};
      if (!type || !meetingId) return;

      switch (type) {
        case "screen-share-start":
          console.log(`🟢 [ShareScreen] ${userId} started sharing in ${meetingId}`);
          io.to(`meeting:${meetingId}`).emit("message", data);
          break;

        case "screen-share-stream":
          // broadcast frame atau data stream ke semua peserta lain
          io.to(`meeting:${meetingId}`).emit("message", data);
          break;

        case "screen-share-stop":
          console.log(`🔴 [ShareScreen] ${userId} stopped sharing in ${meetingId}`);
          io.to(`meeting:${meetingId}`).emit("message", data);
          break;

        default:
          // bukan event share screen → lewati
          break;
      }
    } catch (err) {
      console.error("❌ Error in screenShareSocket handler:", err);
    }
  });
};
