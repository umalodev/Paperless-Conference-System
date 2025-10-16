// socket/chatSocket.js
module.exports = function setupChatSocket(socket, io) {
  socket.on("message", (data) => {
    try {
      if (typeof data === "string") data = JSON.parse(data);
      const { type, meetingId, userId, message } = data || {};
      if (!type || !meetingId) return;

      switch (type) {
        case "chat_message":
          console.log(`💬 [Chat] ${userId}: ${message}`);
          io.to(`meeting:${meetingId}`).emit("message", data);
          break;

        case "typing_start":
        case "typing_stop":
          io.to(`meeting:${meetingId}`).emit("message", data);
          break;

        default:
          // dilewatkan ke handler utama (annotation, screen-share, dsb.)
          break;
      }
    } catch (err) {
      console.error("❌ Error in chatSocket handler:", err);
    }
  });
};
