// sockets/annotationSocket.js
module.exports = function setupAnnotationSocket(socket, io) {
  socket.on("message", (raw) => {
    try {
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      const { type, meetingId, userId, shape } = data || {};
      if (!type || !meetingId) return;

      // Daftar event yang relevan untuk anotasi
      const annotationEvents = [
        "anno:preview",
        "anno:commit",
        "anno:clear",
        "anno:undo",
        "anno:redo",
      ];

      if (annotationEvents.includes(type)) {
        console.log(`🖊️ [Annotation] ${type} from user ${userId} in meeting ${meetingId}`);
        io.to(`meeting:${meetingId}`).emit("message", {
          ...data,
          from: socket.data?.userId || userId,
        });
        return;
      }

      // Support event lama: annotate → dipetakan ke anno:commit
      if (type === "annotate") {
        io.to(`meeting:${meetingId}`).emit("message", {
          type: "anno:commit",
          userId,
          meetingId,
          shape,
        });
        return;
      }
    } catch (err) {
      console.error("❌ Error in annotationSocket handler:", err);
    }
  });
};
