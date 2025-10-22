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
    this._wasConnectedBefore = false;
    this._lastJoinSent = false;
  }

  /**
   * Connect to meeting via Socket.IO
   */
  async connect(meetingId, userId, apiUrl) {

    if (this.socket && this.socket.connected) {
      return;
    }

    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (userData?.id) userId = userData.id;
    } catch (err) {
    }

    this.isConnecting = true;
    this.meetingId = meetingId;
    this.userId = userId;


    try {
      const token = localStorage.getItem("token");

      if (this.socket) this.socket.disconnect();


      this.socket = io(apiUrl, {
        path: "/meeting", // 💡 samakan dengan backend
        query: { token, meetingId, userId }, // ✅ kirim userId juga
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        transports: ["websocket"],
      });

      if (typeof window !== "undefined") window.meetingSocket = this.socket;

      this._registerCoreEvents();
    } catch (err) {
      this.isConnecting = false;
    }
  }

  // =========================================================
  // Core Event Registration
  // =========================================================
  _registerCoreEvents() {
    const socket = this.socket;

    socket.on("connect", () => {
      this.isConnecting = false;
      this.reconnectAttempts = 0;

      // 🔄 Kirim join-room otomatis saat pertama kali connect / reconnect
      const displayName =
        localStorage.getItem("pconf.displayName") ||
        localStorage.getItem("username") ||
        "User";

        if (!this._lastJoinSent) { // ✅ tambah guard
          const displayName =
            localStorage.getItem("pconf.displayName") ||
            localStorage.getItem("username") ||
            "User";

          setTimeout(() => {
            this.send({
              type: "join-room",
              meetingId: this.meetingId,
              userId: this.userId,
              displayName,
              force: true,
            });
          }, 100);
          this._lastJoinSent = true; // ✅ set flag
        }

      this._wasConnectedBefore = true;
      this._lastJoinSent = true;
    });

    socket.on("disconnect", (reason) => {
      this.isConnecting = false;
      this._lastJoinSent = false;
    });

    socket.on("reconnect_attempt", (n) => {
    });

    socket.on("connect_error", (err) => {
      this.isConnecting = false;
    });

    socket.on("error", (err) => {
      this.emit("error", err);
    });

    // 🔔 Semua pesan utama dikirim lewat "message"
    socket.on("message", (data) => {
      this.handleMessage(data);
    });
  }

  // =========================================================
  // Message Handling
  // =========================================================
    handleMessage(data) {
    if (!data?.type) return;

    switch (data.type) {
      case "participants_list":
        this.emit("participants_list", data.data || []);
        break;

      case "participant_joined":
      case "join-room":
        this.emit("participant_joined", data);
        break;

      case "participant_left":
        this.emit("participant_left", data);
        break;

      case "participant_media_changed": // ✅ <---- tambahkan ini
        this.emit("participant_media_changed", data);
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

      case "meeting-ended":
        this.emit("meeting-ended", data);
        break;

      case "error":
        this.emit("error", data);
        break;

      default:
        break;
    }
  }


  // =========================================================
  // Helper: Dispatch ke global window event
  // =========================================================
  _dispatchGlobal(eventName, data) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
  }

  // =========================================================
  // Send Message (prevent duplicate join)
  // =========================================================
  send(message) {
    if (!this.socket) {
      return;
    }

    if (message?.type === "join-room") {
      // Izinkan rejoin jika message.force = true
      if (this._lastJoinSent && !message.force) {
        return;
      }
      this._lastJoinSent = true;
    }

    if (this.socket.connected) {
      this.socket.emit("message", message);
    } else {
    }
  }


  // =========================================================
  // Event Management
  // =========================================================
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
        }
      }
    }
  }

  // =========================================================
  // Disconnect / Cleanup
  // =========================================================
  async disconnect(force = false) {
    if (this.socket) {
      if (force) {
        try {
          this.socket.removeAllListeners();
          if (this.socket.io?.opts) this.socket.io.opts.reconnection = false;
        } catch (e) {
        }

        // 💡 kirim "leave-room" sebelum benar-benar disconnect
        if (this.socket.connected) {
          try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            const displayName =
              localStorage.getItem("pconf.displayName") ||
              user.username ||
              "Unknown";

            this.socket.emit("message", {
              type: "leave-room",
              meetingId: this.meetingId,
              userId: this.userId,
              displayName,
            });
            await new Promise((res) => setTimeout(res, 100)); // beri waktu agar server broadcast
          } catch (err) {
          }
        }
      }

      this.socket.disconnect();
    }

    // ✅ reset semua flag
    this.socket = null;
    this.meetingId = null;
    this.userId = null;
    this.isConnecting = false;
    this._wasConnectedBefore = false;
    this._lastJoinSent = false;
    this.reconnectAttempts = 0;
    this.eventListeners.clear();

    if (typeof window !== "undefined") window.meetingSocket = null;
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
