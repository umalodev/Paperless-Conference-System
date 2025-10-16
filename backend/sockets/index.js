// sockets/index.js
// =========================================================
// 🔌 Socket.IO Aggregator (Modularized)
// =========================================================
const setupChatSocket = require("./chatSocket");
const setupScreenShareSocket = require("./screenShareSocket");
const setupAnnotationSocket = require("./annotationSocket");
const setupMeetingSocket = require("./meetingSocket");

module.exports = function setupAllSockets(io, models, validateMeetingStatus, broadcastToMeeting, roomName) {
  io.on("connection", (socket) => {
    console.log(`🟢 New connection: ${socket.id}`);

    // Pasang semua modul socket
    setupMeetingSocket(socket, io, models, validateMeetingStatus, broadcastToMeeting, roomName);
    setupChatSocket(socket, io);
    setupScreenShareSocket(socket, io);
    setupAnnotationSocket(socket, io);

    // ❌ HAPUS handler disconnect global
    // karena sudah diatur di masing-masing modul (khususnya meetingSocket)
    // socket.on("disconnect", ...)
    // socket.on("error", ...)

    socket.on("error", (err) => {
      console.error(`⚠️ Socket.IO error on ${socket.id}:`, err);
    });
  });
};
