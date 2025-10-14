/**
 * Meeting Socket.IO Service
 * Centralized Socket.IO management for meeting features
 */

import { io } from "socket.io-client";

class MeetingSocketService {
  constructor() {
    this.socket = null;
    this.meetingId = null;
    this.userId = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventListeners = new Map();
  }

  /**
   * Connect to meeting via Socket.IO
   * @param {string} meetingId
   * @param {string} userId
   * @param {string} apiUrl - Base API URL (example: http://192.168.1.5:3000)
   */
  async connect(meetingId, userId, apiUrl) {
    if (this.isConnecting) {
      console.log("Socket.IO connection already in progress");
      return;
    }

    this.isConnecting = true;
    this.meetingId = meetingId;
    this.userId = userId;

    try {
      const token = localStorage.getItem("token");

      // Tutup koneksi lama jika ada
      if (this.socket) {
        this.socket.disconnect();
      }

      console.log(
        `Connecting to Socket.IO meeting: ${apiUrl}, meetingId: ${meetingId}`
      );

      this.socket = io(apiUrl, {
        path: "/meeting", // sesuai backend index.js
        query: {
          token,
          meetingId,
        },
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        transports: ["websocket"], // prefer WebSocket
      });

      // Simpan referensi global untuk akses dari tempat lain
      if (typeof window !== "undefined") {
        window.meetingSocket = this.socket;
      }

      this._registerCoreEvents();

    } catch (err) {
      console.error("Failed to connect Socket.IO:", err);
      this.isConnecting = false;
    }
  }

  /**
   * Register core Socket.IO events (connect, message, disconnect)
   */
  _registerCoreEvents() {
    const socket = this.socket;

    socket.on("connect", () => {
      console.log("✅ Meeting Socket.IO connected:", socket.id);
      this.isConnecting = false;
      this.reconnectAttempts = 0;

      // Kirim event participant_joined
      this.send({
        type: "participant_joined",
        participantId: this.userId,
        username: this.userId,
      });
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket.IO connection error:", err.message);
      this.isConnecting = false;
    });

    socket.on("disconnect", (reason) => {
      console.warn("⚠️ Meeting Socket.IO disconnected:", reason);
      this.isConnecting = false;

      if (reason === "io server disconnect") {
        // server explicitly disconnected
        socket.connect();
      }
    });

    socket.on("reconnect_attempt", (attempt) => {
      console.log(`🔄 Reconnecting attempt ${attempt}`);
    });

    // Semua pesan dikirim backend via event "message"
    socket.on("message", (data) => {
      console.log("📩 Socket.IO message received:", data);
      this.handleMessage(data);
    });

    socket.on("error", (err) => {
      console.error("Socket.IO error:", err);
    });
  }

  /**
   * Handle message by type
   * @param {Object} data
   */
  handleMessage(data) {
    switch (data.type) {
      case "chat_message":
        this.emit("chat_message", data);
        break;

      case "screen-share-start":
      case "screen-share-started":
        console.log("Screen share started by:", data.userId);
        this.emit("screen-share-started", data);
        this._dispatchGlobal("screen-share-started", data);
        break;

      case "screen-share-stopped":
      case "screen-share-stop":
        console.log("Screen share stopped by:", data.userId);
        this.emit("screen-share-stopped", data);
        this._dispatchGlobal("screen-share-stopped", data);
        break;

      case "screen-share-producer-created":
        this.emit("screen-share-producer-created", data);
        this._dispatchGlobal("screen-share-producer-created", data);
        break;

      case "screen-share-producer-closed":
        this.emit("screen-share-producer-closed", data);
        this._dispatchGlobal("screen-share-producer-closed", data);
        break;

      case "meeting-ended":
        console.log("Meeting ended by:", data.username || data.userId);
        this.emit("meeting-ended", data);
        this._dispatchGlobal("meeting-ended", data);
        break;

      case "participant_joined":
        this.emit("participant_joined", data);
        break;

      case "participant_left":
        this.emit("participant_left", data);
        break;

      default:
        console.log("Unknown message type:", data.type);
    }
  }

  /**
   * Dispatch browser global event
   */
  _dispatchGlobal(eventName, data) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
  }

  /**
   * Send message to backend
   * @param {Object} message
   */
  send(message) {
    if (!this.socket) {
      console.warn("Socket not initialized");
      return;
    }

    if (this.socket.connected) {
      this.socket.emit("message", message);
      console.log("📤 Message sent via Socket.IO:", message);
    } else {
      console.warn("Socket.IO not connected. Message skipped:", message);
    }
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const idx = listeners.indexOf(callback);
      if (idx > -1) listeners.splice(idx, 1);
    }
  }

  /**
   * Emit custom event
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error("Error in event listener:", err);
        }
      });
    }
  }

  /**
   * Disconnect Socket.IO
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log("Meeting Socket.IO disconnected manually");
    }
    if (typeof window !== "undefined") {
      window.meetingSocket = null;
    }
    this.eventListeners.clear();
  }

  /**
   * Connection status
   */
  getStatus() {
    if (!this.socket) return "disconnected";
    return this.socket.connected ? "connected" : "disconnected";
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.socket && this.socket.connected;
  }
}

// Export singleton
const meetingSocketService = new MeetingSocketService();
export default meetingSocketService;
