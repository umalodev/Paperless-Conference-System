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
   */
  async connect(meetingId, userId, apiUrl) {
    if (this.socket && this.socket.connected) {
      console.log("Socket.IO already connected");
      return;
    }

    this.isConnecting = true;
    this.meetingId = meetingId;
    this.userId = userId;
    

    try {
      const token = localStorage.getItem("token");

      if (this.socket) this.socket.disconnect();

      console.log(`Connecting to Socket.IO: ${apiUrl}, meetingId=${meetingId}`);

      this.socket = io(apiUrl, {
  path: "/meeting",              // 💡 samakan dengan backend
        query: { token, meetingId },
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        transports: ["websocket"],
      });

      if (typeof window !== "undefined") window.meetingSocket = this.socket;

      this._registerCoreEvents();
    } catch (err) {
      console.error("❌ Failed to connect Socket.IO:", err);
      this.isConnecting = false;
    }
  }

  _registerCoreEvents() {
    const socket = this.socket;

    socket.on("connect", () => {
      console.log("✅ Connected to meeting socket:", socket.id);
      this.isConnecting = false;
      this.reconnectAttempts = 0;

      // 🔄 Rejoin room jika reconnect
      if (this._wasConnectedBefore) {
        console.log("🔄 Reconnected — rejoining room...");
        this.send({
          type: "join-room",
          meetingId: this.meetingId,
          userId: this.userId,
          displayName: localStorage.getItem("pconf.displayName") || "User",
        });
      } else {
        this._wasConnectedBefore = true;
      }
    });

    socket.on("disconnect", (reason) => {
      this._lastJoinSent = false;

      console.warn("⚠️ Socket disconnected:", reason);
      this.isConnecting = false;
    });

    socket.on("reconnect_attempt", (n) => {
      console.log(`🔄 Reconnecting... attempt ${n}`);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err.message);
      this.isConnecting = false;
    });

    // 🔔 Server kirim semua event via "message"
    socket.on("message", (data) => {
      console.log("📩 Message received:", data);
      this.handleMessage(data);
    });

    socket.on("error", (err) => {
      console.error("⚠️ Socket.IO internal error:", err);
    });
  }

  handleMessage(data) {
    if (!data?.type) return;

    switch (data.type) {
      case "participants_list":
        this.emit("participants_list", data.data || []);
        break;

    case "participant_joined":
    case "join-room": // ✅ tambahkan ini
      console.log("⚡ Handling participant joined/join-room:", data);
      this.emit("participant_joined", data); // panggil event yang sama
      break;
      case "participant_left":
        console.log("🚪 Participant left:", data.displayName);
        this.emit("participant_left", data);
        break;

      case "chat_message":
        this.emit("chat_message", data);
        break;

      case "screen-share-start":
      case "screen-share-started":
        this.emit("screen-share-started", data);
        this._dispatchGlobal("screen-share-started", data);
        break;

      case "screen-share-stopped":
      case "screen-share-stop":
        this.emit("screen-share-stopped", data);
        this._dispatchGlobal("screen-share-stopped", data);
        break;

      case "screen-share-producer-created":
        this.emit("screen-share-producer-created", data);
        break;

      case "screen-share-producer-closed":
        this.emit("screen-share-producer-closed", data);
        break;

      case "meeting-ended":
        this.emit("meeting-ended", data);
        break;

      default:
        console.log("ℹ️ Unhandled socket message type:", data.type);
    }
  }

  _dispatchGlobal(eventName, data) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
  }

send(message) {
  if (!this.socket) {
    console.warn("Socket not initialized");
    return;
  }

  // 🚧 Hindari join-room duplikat
  if (message?.type === "join-room") {
    if (this._lastJoinSent) {
      console.warn("⚠️ Duplicate join-room prevented");
      return;
    }
    this._lastJoinSent = true;
  }

  if (this.socket.connected) {
    this.socket.emit("message", message);
    console.log("📤 Message sent:", message);
  } else {
    console.warn("Socket not connected. Message skipped:", message);
  }
}

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const list = this.eventListeners.get(event);
      const i = list.indexOf(callback);
      if (i > -1) list.splice(i, 1);
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      for (const cb of this.eventListeners.get(event)) {
        try {
          cb(data);
        } catch (err) {
          console.error("Event listener error:", err);
        }
      }
    }
  }

  disconnect(force = false) {
  if (this.socket) {
    if (force) {
      console.log("🧹 Forcing full socket cleanup");
      try {
        this.socket.removeAllListeners(); // hapus semua listener internal
        if (this.socket.io?.opts) this.socket.io.opts.reconnection = false; // matikan auto reconnect
      } catch (e) {
        console.warn("⚠️ Cleanup listener error:", e);
      }
    }

    this.socket.disconnect();
    console.log("🔌 Socket.IO manually disconnected");
  }

  // 🔄 Reset semua state internal
  this.socket = null;
  this.meetingId = null;
  this.userId = null;
  this.isConnecting = false;
  this._wasConnectedBefore = false;
  this._lastJoinSent = false; // <– penting untuk hilangkan duplicate join-room
  this.reconnectAttempts = 0;
  this.eventListeners.clear();

  if (typeof window !== "undefined") window.meetingSocket = null;
}



  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log("🔌 Socket.IO manually disconnected");
    }
    if (typeof window !== "undefined") window.meetingSocket = null;
    this.eventListeners.clear();
  }

  getStatus() {
    if (!this.socket) return "disconnected";
    return this.socket.connected ? "connected" : "disconnected";
  }

  isConnected() {
    return !!(this.socket && this.socket.connected);
  }
}

const meetingSocketService = new MeetingSocketService();
export default meetingSocketService;
