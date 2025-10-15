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
    console.log("✅ SimpleScreenShare initialized (Socket.IO mode)");
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

    console.log("🔌 Connecting to Socket.IO:", socketUrl, "meetingId:", meetingId);

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
      console.log("✅ Connected to Socket.IO server:", this.ws.id);
      window.ws = this.ws;

      // Flush pesan yang tertunda
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift();
        this.sendMessage(msg);
      }

      // Kirim event join
      if (this.userId) {
        this.sendMessage({
          type: "participant_joined",
          participantId: this.userId,
          username:
            JSON.parse(localStorage.getItem("user") || "{}").username ||
            "unknown",
        });
      }
    });

    // Saat menerima pesan broadcast dari server
    this.ws.on("message", (data) => {
      try {
        console.log("📩 SimpleScreenShare received:", data.type);
        this.handleMessage(data);
      } catch (error) {
        console.error("❌ Error parsing Socket.IO message:", error);
      }
    });

    // Jika koneksi terputus
    this.ws.on("disconnect", (reason) => {
      console.warn("⚠️ Socket.IO disconnected:", reason);
      // Otomatis reconnect ditangani oleh Socket.IO
    });

    // Error saat koneksi
    this.ws.on("connect_error", (err) => {
      console.error("❌ Socket.IO connection error:", err.message);
    });

    this.ws.on("reconnect_attempt", (attempt) => {
      console.log("🔁 Reconnecting attempt:", attempt);
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
        console.log("Unhandled message type:", data.type);
        break;
    }
  }

  /**
   * Start screen sharing
   */
  async startScreenShare() {
    try {
      console.log("🚀 Starting simple screen share...");
      console.log("window.screenAPI available:", !!window.screenAPI);
      console.log("navigator.mediaDevices available:", !!navigator.mediaDevices);

      if (window.screenAPI && window.screenAPI.isElectron) {
        console.log("🖥 Using Electron screen capture API");
        return await this.startElectronScreenShare();
      } else {
        console.log("🌐 Using Web getDisplayMedia");
        return await this.startWebScreenShare();
      }
    } catch (error) {
      console.error("❌ Failed to start screen share:", error);
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

// 🔹 Buat stream langsung di renderer (bukan preload)
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


    this.currentStream = stream;
    this.isSharing = true;

    this.sendMessage({
      type: "screen-share-start",
      userId: this.userId,
      meetingId: this.meetingId,
      timestamp: Date.now(),
    });

    this.startSendingFrames();
    console.log("✅ Electron screen share started");
    return true;
  } catch (error) {
    console.error("❌ Electron screen share failed:", error);
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

      let stream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
      } catch (err) {
        console.error("getDisplayMedia failed:", err.message);
        throw err;
      }

      this.currentStream = stream;
      this.isSharing = true;

      this.sendMessage({
        type: "screen-share-start",
        userId: this.userId,
        meetingId: this.meetingId,
        timestamp: Date.now(),
      });

      this.startSendingFrames();
      console.log("✅ Web screen share started");
      return true;
    } catch (error) {
      console.error("❌ Failed to start web screen share:", error);
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

    video.onloadedmetadata = () => {
      sendFrame();
    };
  }

  /**
   * Stop screen sharing
   */
  stopScreenShare() {
    console.log("🛑 Stopping screen share...");
    this.isSharing = false;

    if (this.currentStream) {
      this.currentStream.getTracks().forEach((t) => t.stop());
      this.currentStream = null;
    }

    this.sendMessage({
      type: "screen-share-stop",
      userId: this.userId,
      meetingId: this.meetingId,
      timestamp: Date.now(),
    });

    console.log("✅ Screen share stopped");
    return true;
  }

  /**
   * Send message via Socket.IO
   */
  sendMessage(message) {
    if (!this.ws) {
      console.error("❌ No Socket.IO instance");
      return;
    }
    if (this.ws.connected) {
      this.ws.emit("message", message);
    } else {
      console.warn("⏳ Socket.IO not connected, queue message:", message.type);
      this.messageQueue.push(message);
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.stopScreenShare();
    if (this.ws) {
      this.ws.disconnect();
      this.ws = null;
    }
  }
}

// Helper
export function sendWS(msg) {
  simpleScreenShare.sendMessage(msg);
}

// Export singleton
const simpleScreenShare = new SimpleScreenShare();
export default simpleScreenShare;
