// src/features/chat/services/chatSocket.js
import { io } from "socket.io-client";

let socket = null;

/**
 * Koneksi socket ke meeting room
 */
function connect(meetingId, userId, baseUrl) {
  if (socket && socket.connected) return socket;

  socket = io(baseUrl, {
    query: { meetingId, userId },
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    console.log("✅ Chat socket connected:", socket.id);
  });

  socket.on("disconnect", () => {
    console.warn("❌ Chat socket disconnected");
  });

  return socket;
}

/**
 * Kirim event custom
 */
function emit(event, data) {
  if (socket?.connected) socket.emit(event, data);
}

/**
 * Daftar event listener
 */
function on(event, handler) {
  socket?.on(event, handler);
}

/**
 * Hapus event listener
 */
function off(event, handler) {
  socket?.off(event, handler);
}

/**
 * Putuskan koneksi
 */
function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export default {
  connect,
  emit,
  on,
  off,
  disconnect,
};
