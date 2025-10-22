/**
 * Simple Screen Share Service (Socket.IO version)
 * Implementasi screen sharing yang sederhana dan langsung
 */

import { io } from "socket.io-client";
import { API_URL } from "../config";

class SimpleScreenShare {
  constructor() {
    this.isSharing = false;
    this.currentStream = null;
    this.ws = null; // Socket.IO instance
    this.meetingId = null;
    this.userId = null;
    this.onScreenShareReceived = null;
    this.onScreenShareStart = null;
    this.onScreenShareStop = null;
    this.onAnnotationEvent = null;
    this.messageQueue = [];
  }

  /**
   * Initialize simple screen share
   */
  async initialize(meetingId, userId) {
    this.meetingId = meetingId;
    this.userId = userId;
    this.connectWebSocket();
    return true;
  }

  /**
   * Connect to Socket.IO server
   */
  connectWebSocket() {
    const rawBase = (API_URL || "").replace(/\/+$/, "");
    const httpBase = rawBase.replace(
      /^http/i,
      window.location.protocol === "https:" ? "https" : "http"
    );

    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      "";

    const meetingId = this.meetingId;
    const socketUrl = httpBase;

    // Inisialisasi koneksi Socket.IO
    this.ws = io(socketUrl, {
      path: "/meeting",
      query: { token, meetingId },
      transports: ["websocket"], // paksa websocket agar low-latency
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    // ==== EVENT HANDLER ====
    this.ws.on("connect", () => {
      console.log("✅ Connected to screen share server");

      window.ws = this.ws;

      // Flush pesan yang tertunda
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift();
        this.sendMessage(msg);
      }

      // Kirim event join
      if (this.userId) {
        const rawUser = JSON.parse(localStorage.getItem("user") || "{}");
const user =
  rawUser?.data ||
  rawUser?.user ||
  rawUser ||
  {};

        this.sendMessage({
          type: "participant_joined",
          participantId: this.userId,
          username: user.username || user.displayName || "unknown",
          role: user.role || "Participant",
        });
      }
    });

    // Saat menerima pesan broadcast dari server
    this.ws.on("message", (data) => {
      try {
        this.handleMessage(data);
      } catch (error) {
        console.error("Parse message error:", error);
      }
    });

    this.ws.on("disconnect", (reason) => {
      console.warn("🔌 ScreenShare disconnected:", reason);
    });

    this.ws.on("connect_error", (err) => {
      console.error("❌ ScreenShare connection error:", err.message);
    });

    this.ws.on("reconnect_attempt", (attempt) => {
      console.log(`♻️ Reconnect attempt ${attempt}`);
    });
  }

  /**
   * Handle incoming messages
   */
  handleMessage(data) {
    switch (data.type) {
      case "screen-share-start":
        if (this.onScreenShareStart) this.onScreenShareStart(data);
        break;

      case "screen-share-stop":
      case "screen-share-stopped":
        if (this.onScreenShareStop) this.onScreenShareStop(data);
        break;

      case "screen-share-stream":
        if (this.onScreenShareReceived) this.onScreenShareReceived(data);
        break;

      // 🔹 Annotation events
      case "anno:commit":
      case "anno:clear":
      case "anno:undo":
      case "anno:redo":
      case "anno:preview":
        if (this.onAnnotationEvent) this.onAnnotationEvent(data);
        break;

      default:
        break;
    }
  }

  /**
   * Start screen sharing (auto detect Electron or Web)
   */
  async startScreenShare() {
    try {
      if (window.screenAPI && window.screenAPI.isElectron) {
        return await this.startElectronScreenShare();
      } else {
        return await this.startWebScreenShare();
      }
    } catch (error) {
      console.error("Start share failed:", error);
      return false;
    }
  }

  /**
   * Electron screen share
   */
  async startElectronScreenShare() {
    try {
      if (!window.screenAPI || !window.screenAPI.getScreenSources) {
        throw new Error("screenAPI not available");
      }

      const sources = await window.screenAPI.getScreenSources();
      if (sources.length === 0) throw new Error("No screen sources found");

      const source = sources[0];
      const sourceId = await window.screenAPI.createScreenStream(source.id);

      // 🔹 Buat stream langsung di renderer
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: sourceId,
            minWidth: 640,
            maxWidth: 1920,
            minHeight: 480,
            maxHeight: 1080,
          },
        },
      });

      this.currentStream = stream;
      this.isSharing = true;

      const rawUser = JSON.parse(localStorage.getItem("user") || "{}");
const user =
  rawUser?.data ||
  rawUser?.user ||
  rawUser ||
  {};


      this.sendMessage({
        type: "screen-share-start",
        userId: this.userId,
        meetingId: this.meetingId,
        displayName:
          user.displayName ||
          user.username ||
          user.name ||
          user.fullName ||
          user.email ||
          `User ${this.userId}`,
        role:
          user.role?.charAt(0).toUpperCase() + user.role?.slice(1) ||
          "Participant",

        role: user.role || "Participant",
        timestamp: Date.now(),
      });

      console.log("📡 Sending screen-share-start:", {
  userId: this.userId,
  displayName: user.displayName,
  role: user.role,
});


      this.startSendingFrames();
      return true;
    } catch (error) {
      console.error("Electron screen share fallback to web:", error);
      return await this.startWebScreenShare();
    }
  }

  /**
   * Web screen share
   */
  async startWebScreenShare() {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia)
        throw new Error("getDisplayMedia not supported");

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      this.currentStream = stream;
      this.isSharing = true;

      const rawUser = JSON.parse(localStorage.getItem("user") || "{}");
const user =
  rawUser?.data ||
  rawUser?.user ||
  rawUser ||
  {};


      this.sendMessage({
        type: "screen-share-start",
        userId: this.userId,
        meetingId: this.meetingId,
        displayName:
          user.displayName ||
          user.username ||
          user.name ||
          user.fullName ||
          user.email ||
          `User ${this.userId}`,
        role:
          user.role?.charAt(0).toUpperCase() + user.role?.slice(1) ||
          "Participant",

        timestamp: Date.now(),
      });

      this.startSendingFrames();
      return true;
    } catch (error) {
      console.error("StartWebScreenShare error:", error);
      return false;
    }
  }

  /**
   * Start sending video frames
   */
  startSendingFrames() {
    if (!this.currentStream) return;

    const video = document.createElement("video");
    video.srcObject = this.currentStream;
    video.play();

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const sendFrame = () => {
      if (!this.isSharing || !this.currentStream) return;

      let width = video.videoWidth;
      let height = video.videoHeight;
      const maxWidth = 1920;
      const maxHeight = 1080;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(video, 0, 0, width, height);

      const imageData = canvas.toDataURL("image/jpeg", 0.7);

      this.sendMessage({
        type: "screen-share-stream",
        userId: this.userId,
        meetingId: this.meetingId,
        imageData,
        timestamp: Date.now(),
      });

      setTimeout(sendFrame, 200); // ~5 FPS
    };

    video.onloadedmetadata = () => sendFrame();
  }

  /**
   * Stop screen sharing
   */
  stopScreenShare() {
    this.isSharing = false;

    if (this.currentStream) {
      this.currentStream.getTracks().forEach((t) => t.stop());
      this.currentStream = null;
    }

    const rawUser = JSON.parse(localStorage.getItem("user") || "{}");
const user =
  rawUser?.data ||
  rawUser?.user ||
  rawUser ||
  {};


    this.sendMessage({
      type: "screen-share-stop",
      userId: this.userId,
      meetingId: this.meetingId,
      displayName:
        user.displayName ||
        user.username ||
        user.name ||
        user.fullName ||
        user.email ||
        `User ${this.userId}`,
      role:
        user.role?.charAt(0).toUpperCase() + user.role?.slice(1) ||
        "Participant",
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Send message via Socket.IO
   */
  sendMessage(message) {
    if (!this.ws) return;

    if (this.ws.connected) {
      this.ws.emit("message", message);
    } else {
      this.messageQueue.push(message);
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    try {
      if (this.isSharing) this.stopScreenShare();

      if (this.ws && this.ws.connected) {
        const rawUser = JSON.parse(localStorage.getItem("user") || "{}");
const user =
  rawUser?.data ||
  rawUser?.user ||
  rawUser ||
  {};

        this.ws.emit("message", {
          type: "screen-share-stop",
          userId: this.userId,
          meetingId: this.meetingId,
          displayName:
            user.displayName ||
            user.username ||
            user.name ||
            user.fullName ||
            user.email ||
            `User ${this.userId}`,
          role:
            user.role?.charAt(0).toUpperCase() + user.role?.slice(1) ||
            "Participant",
          timestamp: Date.now(),
          reason: "client_cleanup",
        });
        this.ws.disconnect();
      }

      this.currentStream = null;
      this.ws = null;
      this.isSharing = false;
    } catch (err) {
      console.error("Cleanup error:", err);
    }
  }
}

// Helper
export function sendWS(msg) {
  simpleScreenShare.sendMessage(msg);
}

// Export singleton
const simpleScreenShare = new SimpleScreenShare();

if (typeof window !== "undefined") {
  window.simpleScreenShare = simpleScreenShare;
}

export default simpleScreenShare;
