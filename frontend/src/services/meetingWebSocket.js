// src/utils/meetingWebSocket.js (atau path kamu)
class MeetingWebSocketService {
  constructor() {
    this.ws = null;
    this.meetingId = null;
    this.userId = null;
    this.apiUrl = null;
    this.token = null;

    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.eventListeners = new Map();
    this.isConnecting = false;
  }

  // ▶️ CONNECT: sekarang butuh token
  async connect(meetingId, userId, apiUrl, token) {
    const rawFromArg =
      token ||
      (typeof localStorage !== "undefined"
        ? localStorage.getItem("token")
        : "");
    const cleanToken = (rawFromArg || "").replace(/^Bearer\s+/i, "");
    if (this.isConnecting) {
      console.log("WebSocket connection already in progress");
      return;
    }
    this.isConnecting = true;

    this.meetingId = meetingId;
    this.userId = userId;
    this.apiUrl = apiUrl;
    this.token = token;
    this.token = cleanToken;

    try {
      // tutup koneksi lama (jika ada)
      if (this.ws) {
        try {
          this.ws.close();
        } catch {}
        this.ws = null;
      }

      const api = new URL(apiUrl);
      const wsProtocol = api.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${wsProtocol}//${api.host}/meeting/${encodeURIComponent(
        meetingId
      )}?token=${encodeURIComponent(this.token)}`;

      console.log("Connecting to meeting WebSocket:", wsUrl);
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      if (typeof window !== "undefined") {
        window.meetingWebSocket = ws;
      }

      ws.onopen = () => {
        console.log("Meeting WebSocket connected");
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // identifikasi + sertakan meetingId
        this.send({
          type: "participant_joined",
          participantId: this.userId,
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        console.warn(
          "Meeting WebSocket disconnected:",
          event.code,
          event.reason
        );
        if (event.code === 4401) {
          console.error(
            "Meeting WS unauthorized. Cek: token kosong/salah, kedaluwarsa, atau secret JWT beda."
          );
        }
        this.isConnecting = false;

        if (window.meetingWebSocket === ws) window.meetingWebSocket = null;
        if (event.code === 1000) return; // normal close

        // reconnect (pakai token yang sama)
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
          console.log(
            `Meeting WS reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
          );
          this.reconnectTimeout = setTimeout(() => {
            if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
              this.connect(
                this.meetingId,
                this.userId,
                this.apiUrl,
                this.token
              );
            }
          }, delay);
        } else {
          console.error("Meeting WebSocket max reconnection attempts reached");
        }
      };

      ws.onerror = (error) => {
        console.error("Meeting WebSocket error:", error);
        this.isConnecting = false;
      };
    } catch (error) {
      console.error("Failed to connect to meeting WebSocket:", error);
      this.isConnecting = false;
    }
  }

  handleMessage(data) {
    // teruskan ke pendengar lokal
    this.emit(data.type, data);

    // (opsional) contoh logs
    // console.log("Meeting WebSocket message:", data);
  }

  // ⬅️ selalu sisipkan meetingId
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const payload = this.meetingId
        ? { meetingId: this.meetingId, ...message }
        : message;
      this.ws.send(JSON.stringify(payload));
      // console.log("Meeting WS sent:", payload);
    } else {
      console.warn("Meeting WS not connected; cannot send:", message);
    }
  }

  on(event, callback) {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.eventListeners.has(event)) return;
    const list = this.eventListeners.get(event);
    const idx = list.indexOf(callback);
    if (idx > -1) list.splice(idx, 1);
  }

  emit(event, data) {
    if (!this.eventListeners.has(event)) return;
    for (const cb of this.eventListeners.get(event)) {
      try {
        cb(data);
      } catch (e) {
        console.error("Event listener error:", e);
      }
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      try {
        this.ws.close(1000, "Normal closure");
      } catch {}
      this.ws = null;
    }
    if (typeof window !== "undefined") window.meetingWebSocket = null;
    this.eventListeners.clear();
    this.isConnecting = false;
    console.log("Meeting WebSocket disconnected");
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  getStatus() {
    if (!this.ws) return "disconnected";
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "connecting";
      case WebSocket.OPEN:
        return "connected";
      case WebSocket.CLOSING:
        return "closing";
      case WebSocket.CLOSED:
        return "disconnected";
      default:
        return "unknown";
    }
  }

  // ➕ tambahan: ambil instance ws mentah (buat hook RTC)
  getSocket() {
    return this.ws;
  }
}

const meetingWebSocketService = new MeetingWebSocketService();
export default meetingWebSocketService;
