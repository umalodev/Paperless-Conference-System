const path = require("path");
const express = require("express");
const cors = require("cors");
const { verifyToken } = require("./utils/jwt");
const http = require("http");
const WebSocket = require("ws");
const routes = require("./routes");
const os = require("os");

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";

const UPLOAD_DIR = path.resolve(__dirname, "uploads");

function getLanIPs() {
  const ifs = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(ifs)) {
    for (const i of ifs[name] || []) {
      if (i.family === "IPv4" && !i.internal) ips.push(i.address);
    }
  }
  return ips;
}

// WebSocket server for meeting rooms
const wss = new WebSocket.Server({ server });

// Store WebSocket server globally for use in controllers
global.wss = wss;

// Export WebSocket server for use in controllers
module.exports.getWebSocketServer = () => wss;

// Function to validate meeting status
const validateMeetingStatus = async (meetingId) => {
  try {
    const models = require("./models");

    // Check if meeting exists
    const meeting = await models.Meeting.findByPk(meetingId);
    if (!meeting) {
      console.log(`Meeting ${meetingId} not found`);
      return false;
    }

    // Check if meeting is active or started (both are valid for WebSocket)
    if (meeting.status !== "active" && meeting.status !== "started") {
      console.log(
        `Meeting ${meetingId} is not active/started (status: ${meeting.status})`
      );
      return false;
    }

    // Check if meeting has host
    const hostParticipant = await models.MeetingParticipant.findOne({
      where: {
        meetingId,
        role: "host",
        flag: "Y",
      },
    });

    if (!hostParticipant) {
      console.log(`Meeting ${meetingId} has no host`);
      return false;
    }

    console.log(`Meeting ${meetingId} is valid for WebSocket connection`);
    return true;
  } catch (error) {
    console.error(`Error validating meeting ${meetingId}:`, error);
    return false;
  }
};

const rooms = new Map(); // meetingId -> Set<ws>
const socketsByParticipant = new Map(); // `${meetingId}:${participantId}` -> ws
const participantStates = new Map(); // `${meetingId}:${participantId}` -> { micOn, camOn }

// WebSocket connection handling
wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const meetingId = url.pathname.split("/")[2];
  const token = url.searchParams.get("token");

  if (!meetingId) {
    console.log("No meeting ID provided, closing connection");
    ws.close();
    return;
  }

  try {
    if (!token) throw new Error("No token");
    const payload = verifyToken(token);
    ws.user = {
      id: payload.id,
      username: payload.username,
      role: payload.role,
    };
  } catch (err) {
    console.log("WS auth failed:", err && err.message);
    ws.close(4401, "Unauthorized");
    return;
  }

  console.log(
    `WebSocket connected to meeting: ${meetingId}, user: ${
      ws.user?.username || "unknown"
    }`
  );

  // Store meeting ID in the WebSocket object
  ws.meetingId = meetingId;
  ws.isAlive = true;
  ws.userId = null; // Will be set when user identifies themselves

  // Add to room
  if (!rooms.has(meetingId)) rooms.set(meetingId, new Set());
  rooms.get(meetingId).add(ws);

  const keyOf = (mid, pid) => `${mid}:${pid}`;

  const sendTo = (mid, targetParticipantId, payload) => {
    const target = socketsByParticipant.get(keyOf(mid, targetParticipantId));
    if (target && target.readyState === WebSocket.OPEN) {
      target.send(JSON.stringify(payload));
      return true;
    }
    return false;
  };

  const broadcastToRoom = (mid, payload, excludeWs = null) => {
    const room = rooms.get(mid);
    if (!room) return;

    room.forEach((client) => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(payload));
      }
    });
  };

  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      console.warn("Invalid JSON message received");
      return;
    }

    // Set participantId on first message if not set
    if (data.participantId && !ws.userId) {
      ws.userId = data.participantId;
      socketsByParticipant.set(keyOf(ws.meetingId, ws.userId), ws);

      // Initialize participant state
      const stateKey = keyOf(ws.meetingId, ws.userId);
      if (!participantStates.has(stateKey)) {
        participantStates.set(stateKey, { micOn: true, camOn: true });
      }

      console.log(`User ${ws.userId} identified in meeting ${ws.meetingId}`);
    }

    // Validate meeting for each message
    validateMeetingStatus(meetingId).then((isValid) => {
      if (!isValid) {
        console.log(
          `Meeting ${meetingId} validation failed, closing connection`
        );
        ws.close();
        return;
      }

      // Add meetingId to all messages if not present
      if (!data.meetingId) {
        data.meetingId = meetingId;
      }

      console.log(
        `[${meetingId}] Message: ${data.type} from ${
          data.from || ws.userId
        } to ${data.to || "broadcast"}`
      );

      // ---- WebRTC Signaling (one-to-one) ----
      if (
        data.type === "rtc-init" ||
        data.type === "rtc-offer" ||
        data.type === "rtc-answer" ||
        data.type === "rtc-ice"
      ) {
        if (!data.to) {
          console.warn(`${data.type} message missing 'to' field`);
          return;
        }

        const targetKey = keyOf(meetingId, data.to);
        const target = socketsByParticipant.get(targetKey);

        if (target && target.readyState === WebSocket.OPEN) {
          const payload = { ...data, meetingId };
          target.send(JSON.stringify(payload));
          console.log(`Relayed ${data.type} from ${data.from} to ${data.to}`);
        } else {
          console.warn(
            `Target ${data.to} not found or not connected for ${data.type}`
          );
        }
        return;
      }

      // ---- Media State Changes ----
      if (data.type === "media-toggle") {
        // Update local state
        const stateKey = keyOf(meetingId, data.from || ws.userId);
        const currentState = participantStates.get(stateKey) || {
          micOn: true,
          camOn: true,
        };

        if (data.audio !== undefined) {
          currentState.micOn = data.audio;
        }
        if (data.video !== undefined) {
          currentState.camOn = data.video;
        }

        participantStates.set(stateKey, currentState);

        // Forward to specific target if specified
        if (data.to) {
          const targetKey = keyOf(meetingId, data.to);
          const target = socketsByParticipant.get(targetKey);
          if (target && target.readyState === WebSocket.OPEN) {
            target.send(JSON.stringify({ ...data, meetingId }));
          }
        } else {
          // Broadcast to all participants in the room
          broadcastToRoom(meetingId, { ...data, meetingId }, ws);
        }

        console.log(
          `Media toggle: ${data.from || ws.userId} - mic: ${
            currentState.micOn
          }, cam: ${currentState.camOn}`
        );
        return;
      }

      // ---- Participant Management ----
      if (data.type === "participant_joined") {
        console.log(
          `Participant ${data.participantId} joined meeting ${meetingId}`
        );

        // Notify all other participants
        broadcastToRoom(
          meetingId,
          {
            type: "participant_joined",
            participantId: data.participantId,
            meetingId,
            timestamp: new Date().toISOString(),
          },
          ws
        );

        // Send current participant states to the new participant
        participantStates.forEach((state, key) => {
          const [mid, pid] = key.split(":");
          if (mid === meetingId && pid !== data.participantId) {
            ws.send(
              JSON.stringify({
                type: "participant_state",
                participantId: pid,
                micOn: state.micOn,
                camOn: state.camOn,
                meetingId,
              })
            );
          }
        });

        return;
      }

      // ---- Chat Messages ----
      if (data.type === "chat_message") {
        broadcastToRoom(
          meetingId,
          {
            type: "chat_message",
            messageId: data.messageId,
            userId: data.userId,
            username: data.username,
            message: data.message,
            messageType: data.messageType,
            timestamp: data.timestamp,
            meetingId,
          },
          ws
        );
        return;
      }

      // ---- Typing Indicators ----
      if (data.type === "typing_start" || data.type === "typing_stop") {
        broadcastToRoom(
          meetingId,
          {
            type: data.type,
            userId: data.userId,
            username: data.username,
            meetingId,
          },
          ws
        );
        return;
      }

      // ---- Screen Share Events ----
      if (data.type === "screen-share-start") {
        broadcastToRoom(
          meetingId,
          {
            type: "screen-share-start",
            userId: data.userId,
            username: data.username,
            meetingId,
            timestamp: data.timestamp,
          },
          ws
        );
        return;
      }

      if (data.type === "screen-share-stream") {
        broadcastToRoom(
          meetingId,
          {
            type: "screen-share-stream",
            userId: data.userId,
            meetingId,
            imageData: data.imageData,
            timestamp: data.timestamp,
          },
          ws
        );
        return;
      }

      if (data.type === "screen-share-stop") {
        broadcastToRoom(
          meetingId,
          {
            type: "screen-share-stopped",
            userId: data.userId,
            username: data.username,
            meetingId,
            timestamp: data.timestamp,
          },
          ws
        );
        return;
      }

      if (data.type === "screen-share-producer-created") {
        broadcastToRoom(
          meetingId,
          {
            type: "screen-share-producer-created",
            userId: data.userId,
            producerId: data.producerId,
            kind: data.kind,
            meetingId,
          },
          ws
        );
        return;
      }

      if (data.type === "screen-share-producer-closed") {
        broadcastToRoom(
          meetingId,
          {
            type: "screen-share-producer-closed",
            userId: data.userId,
            producerId: data.producerId,
            meetingId,
          },
          ws
        );
        return;
      }

      // ---- Meeting End ----
      if (data.type === "meeting-end") {
        broadcastToRoom(meetingId, {
          type: "meeting-ended",
          userId: data.userId,
          username: data.username,
          meetingId,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // ---- Unknown message types ----
      console.warn(`Unknown message type: ${data.type}`);
    });
  });

  // Handle client disconnect
  ws.on("close", (code, reason) => {
    console.log(
      `WebSocket disconnected from meeting: ${meetingId}, user: ${
        ws.userId || "unknown"
      }, code: ${code}, reason: ${reason}`
    );

    // Remove from room
    const room = rooms.get(ws.meetingId);
    if (room) {
      room.delete(ws);
      if (room.size === 0) {
        rooms.delete(ws.meetingId);
        console.log(`Room ${ws.meetingId} is now empty and removed`);
      }
    }

    // Remove from participant tracking
    if (ws.userId) {
      const participantKey = keyOf(ws.meetingId, ws.userId);
      socketsByParticipant.delete(participantKey);
      participantStates.delete(participantKey);

      // Notify other participants that this user left
      broadcastToRoom(ws.meetingId, {
        type: "participant_left",
        participantId: ws.userId,
        meetingId: ws.meetingId,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Handle errors
  ws.on("error", (error) => {
    console.error(`WebSocket error in meeting ${meetingId}:`, error);
  });

  // Ping-pong to keep connections alive
  ws.on("pong", () => {
    ws.isAlive = true;
  });
});

// Keep WebSocket connections alive
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log(
        `Terminating inactive WebSocket connection for user ${ws.userId}`
      );
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on("close", () => {
  clearInterval(interval);
});

// Load database and models
const sequelize = require("./db/db");
const models = require("./models");

function buildAllowedOrigins() {
  const base = new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);
  const ifs = os.networkInterfaces();
  for (const name of Object.keys(ifs)) {
    for (const i of ifs[name] || []) {
      if (i.family === "IPv4" && !i.internal) {
        base.add(`http://${i.address}:5173`);
        base.add(`http://${i.address}:3000`);
      }
    }
  }
  return base;
}

const ALLOWED_ORIGINS = buildAllowedOrigins();

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl/postman
      if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
      return cb(new Error("CORS not allowed: " + origin), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use routes
app.use("/api", routes);

app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    index: false,
    setHeaders: (res) => {
      // biar PDF/gambar bisa dibuka lintas origin
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Terjadi kesalahan server",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint tidak ditemukan",
  });
});

// Start server after database sync
const startServer = async () => {
  try {
    // Sync database
    await sequelize.sync({ force: false, alter: true });
    console.log("Database synced successfully - tables created/updated");

    // Start server
    server.listen(PORT, HOST, () => {
      const lans = getLanIPs();
      console.log(`Backend listening on ${HOST}:${PORT}`);
      console.log(`- Local:  http://localhost:${PORT}`);
      lans.forEach((ip) => {
        console.log(`- LAN:    http://${ip}:${PORT}`);
        console.log(`  API:    http://${ip}:${PORT}/api`);
        console.log(`  WS:     ws://${ip}:${PORT}/meeting/{meetingId}`);
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
