/**
 * Simple Screen Share Service
 * Implementasi screen sharing yang sederhana dan langsung
 */
import { API_URL } from "../config";

class SimpleScreenShare {
  constructor() {
    this.isSharing = false;
    this.currentStream = null;
    this.ws = null;
    this.meetingId = null;
    this.userId = null;
    this.onScreenShareReceived = null;
    this.onScreenShareStart = null;
    this.onScreenShareStop = null;
  }

  /**
   * Initialize simple screen share
   */
  async initialize(meetingId, userId) {
    this.meetingId = meetingId;
    this.userId = userId;

    // Connect to WebSocket
    this.connectWebSocket();

    console.log("SimpleScreenShare initialized");
    return true;
  }

  /**
   * Connect to WebSocket
   */
  connectWebSocket() {
    // Use environment-based WebSocket URL

    const rawBase = (API_URL || "").replace(/\/+$/, "");
    const wsBase = rawBase.replace(
      /^http/i,
      window.location.protocol === "https:" ? "wss" : "ws"
    );
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      "";
    const qs = token ? `?token=${encodeURIComponent(token)}` : "";
    const wsUrl = `${wsBase}/meeting/${this.meetingId}${qs}`;

    console.log("Connecting to WebSocket:", wsUrl);
    console.log("Environment:", process.env.NODE_ENV);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("SimpleScreenShare WebSocket connected successfully");
      if (this.userId) {
        this.ws.send(
          JSON.stringify({
            type: "participant_joined",
            participantId: this.userId,
            username:
              JSON.parse(localStorage.getItem("user") || "{}").username ||
              "unknown",
          })
        );
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("SimpleScreenShare received message:", data.type);
        this.handleMessage(data);
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };

    this.ws.onclose = (evt) => {
      console.log(
        "SimpleScreenShare WebSocket disconnected",
        evt.code,
        evt.reason
      );
      // kalau unauthorized, jangan reconnect terus2an
      if (evt.code === 4401) {
        console.error(
          "WS closed: unauthorized. Pastikan token login tersedia/valid."
        );
        return;
      }
      // Reconnect setelah 3 detik
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    this.ws.onerror = (error) => {
      console.error("SimpleScreenShare WebSocket error:", error);
    };
  }

  /**
   * Handle WebSocket messages
   */
  handleMessage(data) {
    console.log("=== SimpleScreenShare Message Received ===");
    console.log("Message type:", data.type);
    console.log("From user:", data.userId);
    console.log("Meeting ID:", data.meetingId);
    console.log("Current user ID:", this.userId);
    console.log("Is from different user:", data.userId !== this.userId);
    console.log("Full message:", data);

    switch (data.type) {
      case "screen-share-start":
        console.log("Handling screen-share-start event");
        if (this.onScreenShareStart) {
          this.onScreenShareStart(data);
        }
        break;

      case "screen-share-stop":
      case "screen-share-stopped":
        console.log("Handling screen-share-stop event");
        if (this.onScreenShareStop) {
          this.onScreenShareStop(data);
        }
        break;

      case "screen-share-stream":
        console.log("Handling screen-share-stream event");
        console.log("Image data length:", data.imageData?.length || 0);
        console.log(
          "Image data preview:",
          data.imageData?.substring(0, 100) + "..."
        );

        // Process screen share stream from any user (including own stream for preview)
        console.log("Processing screen share stream from user:", data.userId);
        if (this.onScreenShareReceived) {
          this.onScreenShareReceived(data);
        }
        break;

      default:
        console.log("Unhandled message type:", data.type);
        break;
    }
    console.log("=== End Message Handling ===");
  }

  /**
   * Start screen sharing
   */
  async startScreenShare() {
    try {
      console.log("Starting simple screen share...");
      console.log("window.screenAPI available:", !!window.screenAPI);
      console.log("window.screenAPI.isElectron:", window.screenAPI?.isElectron);
      console.log(
        "navigator.mediaDevices available:",
        !!navigator.mediaDevices
      );
      console.log(
        "navigator.mediaDevices.getDisplayMedia available:",
        !!navigator.mediaDevices?.getDisplayMedia
      );

      // Test preload if available
      if (window.screenAPI && window.screenAPI.testPreload) {
        try {
          const testResult = window.screenAPI.testPreload();
          console.log("Preload test result:", testResult);
        } catch (error) {
          console.error("Preload test failed:", error);
        }
      }

      // Check if we're in Electron and have the screenAPI
      if (window.screenAPI && window.screenAPI.isElectron) {
        console.log("Using Electron screen capture API");
        return await this.startElectronScreenShare();
      } else {
        console.log("Using web screen capture API");
        return await this.startWebScreenShare();
      }
    } catch (error) {
      console.error("Failed to start screen share:", error);
      return false;
    }
  }

  /**
   * Start screen sharing using Electron's desktopCapturer
   */
  async startElectronScreenShare() {
    try {
      console.log("Starting Electron screen share...");

      // Check if screenAPI is available
      if (!window.screenAPI || !window.screenAPI.getScreenSources) {
        throw new Error(
          "screenAPI not available or getScreenSources method missing"
        );
      }

      // Get available screen sources
      const sources = await window.screenAPI.getScreenSources();
      console.log("Available screen sources:", sources);

      if (sources.length === 0) {
        throw new Error("No screen sources available");
      }

      // Use the first screen source
      const source = sources[0];
      console.log("Using screen source:", source);

      // Create screen stream using Electron's desktopCapturer
      this.currentStream = await window.screenAPI.createScreenStream(source.id);

      this.isSharing = true;

      // Send start event
      this.sendMessage({
        type: "screen-share-start",
        userId: this.userId,
        meetingId: this.meetingId,
        timestamp: Date.now(),
      });

      // Start sending video frames
      this.startSendingFrames();

      console.log("Electron screen share started");
      return true;
    } catch (error) {
      console.error("Failed to start Electron screen share:", error);
      // Fallback to web API if Electron method fails
      console.log("Falling back to web screen capture API");
      return await this.startWebScreenShare();
    }
  }

  /**
   * Start screen sharing using web getDisplayMedia API
   */
  async startWebScreenShare() {
    try {
      console.log("Starting web screen share...");

      // Check if getDisplayMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error(
          "getDisplayMedia API not supported in this environment"
        );
      }

      // Try different approaches for Electron
      let stream;

      // First try: Standard getDisplayMedia
      try {
        console.log("Trying standard getDisplayMedia...");
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
      } catch (firstError) {
        console.log("Standard getDisplayMedia failed:", firstError.message);

        // Second try: getUserMedia with Electron-specific constraints
        try {
          console.log("Trying getUserMedia with Electron constraints...");
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              // @ts-ignore - Electron specific constraint
              mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: "screen:0:0", // Default screen
                minWidth: 1280,
                maxWidth: 1920,
                minHeight: 720,
                maxHeight: 1080,
              },
            },
          });
        } catch (secondError) {
          console.log("Electron getUserMedia failed:", secondError.message);
          throw firstError; // Throw the original error
        }
      }

      this.currentStream = stream;
      this.isSharing = true;

      // Send start event
      this.sendMessage({
        type: "screen-share-start",
        userId: this.userId,
        meetingId: this.meetingId,
        timestamp: Date.now(),
      });

      // Start sending video frames
      this.startSendingFrames();

      console.log("Web screen share started");
      return true;
    } catch (error) {
      console.error("Failed to start web screen share:", error);

      // Provide more specific error messages
      if (
        error.name === "NotSupportedError" ||
        error.message.includes("Not supported")
      ) {
        console.error(
          "Screen sharing is not supported in this environment. This might be due to:"
        );
        console.error("1. Running in Electron without proper permissions");
        console.error("2. Browser security restrictions");
        console.error("3. Missing HTTPS in production");
      }

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
      // Choose dynamic max resolution based on viewport (cap to 1920x1080)
      const viewportW =
        (typeof window !== "undefined" ? window.innerWidth : 1280) || 1280;
      const viewportH =
        (typeof window !== "undefined" ? window.innerHeight : 720) || 720;
      const maxWidth = Math.min(1920, Math.max(960, viewportW));
      const maxHeight = Math.min(1080, Math.max(540, viewportH));
      let width = video.videoWidth;
      let height = video.videoHeight;

      // Scale down if too large
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(video, 0, 0, width, height);

      // Convert to base64 with moderate quality to keep clarity
      const imageData = canvas.toDataURL("image/jpeg", 0.7);

      // Send frame
      this.sendMessage({
        type: "screen-share-stream",
        userId: this.userId,
        meetingId: this.meetingId,
        imageData: imageData,
        timestamp: Date.now(),
      });

      // Continue sending frames
      setTimeout(sendFrame, 200); // ~5 FPS for better smoothness
    };

    video.onloadedmetadata = () => {
      sendFrame();
    };
  }

  /**
   * Stop screen sharing
   */
  stopScreenShare() {
    console.log("Stopping simple screen share...");

    this.isSharing = false;

    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }

    // Send stop event
    this.sendMessage({
      type: "screen-share-stop",
      userId: this.userId,
      meetingId: this.meetingId,
      timestamp: Date.now(),
    });

    console.log("Simple screen share stopped");
    return true;
  }

  /**
   * Send WebSocket message
   */
  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(
        "Sending WebSocket message:",
        message.type,
        "to meeting:",
        this.meetingId
      );
      this.ws.send(JSON.stringify(message));
    } else {
      console.error("WebSocket not connected. State:", this.ws?.readyState);
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.stopScreenShare();
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Export singleton
const simpleScreenShare = new SimpleScreenShare();
export default simpleScreenShare;
