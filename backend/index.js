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

    // Check if host is online (but don't require them to be joined for WebSocket)
    // WebSocket should work even if host is not yet joined
    console.log(`Meeting ${meetingId} is valid for WebSocket connection`);
    return true;
  } catch (error) {
    console.error(`Error validating meeting ${meetingId}:`, error);
    return false;
  }
};

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
  } catch {
    console.log("WS auth failed");
    ws.close(4401, "Unauthorized");
    return;
  }

  console.log(`WebSocket connected to meeting: ${meetingId}`);

  // Store meeting ID in the WebSocket object
  ws.meetingId = meetingId;
  ws.isAlive = true;
  ws.userId = null; // Will be set when user identifies themselves

  // Handle incoming messages
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`WebSocket message from meeting ${meetingId}:`, data);

      // Set userId if this is the first message
      if (data.participantId && !ws.userId) {
        ws.userId = data.participantId;
        console.log(
          `User ${data.participantId} identified in meeting ${meetingId}`
        );
      }

      // Validate meeting status before processing messages
      validateMeetingStatus(meetingId).then((isValid) => {
        if (!isValid) {
          console.log(`Meeting ${meetingId} is not valid, closing connection`);
          ws.close();
          return;
        }

        // Broadcast message to all other clients in the same meeting
        let clientCount = 0;
        console.log(`Broadcasting message to meeting ${meetingId}:`, data);
        console.log(`Total clients in WebSocket server: ${wss.clients.size}`);

        wss.clients.forEach((client) => {
          console.log(
            `Client meetingId: ${client.meetingId}, readyState: ${
              client.readyState
            }, is same: ${client === ws}`
          );
          if (
            client !== ws &&
            client.readyState === WebSocket.OPEN &&
            client.meetingId === meetingId
          ) {
            console.log(`Sending message to client in meeting ${meetingId}`);
            client.send(JSON.stringify(data));
            clientCount++;
          }
        });
        console.log(
          `Message broadcasted to ${clientCount} clients in meeting ${meetingId}`
        );

        // Special handling for participant_ready_to_receive message
        if (data.type === "participant_ready_to_receive") {
          console.log(
            `Participant ${data.from} is ready to receive video in meeting ${meetingId}`
          );

          // Notify host that participant is ready
          wss.clients.forEach((client) => {
            if (
              client !== ws &&
              client.readyState === WebSocket.OPEN &&
              client.meetingId === meetingId
            ) {
              // Send notification to host
              console.log(
                `Forwarding participant_ready_to_receive to client ${
                  client.userId || "unknown"
                }`
              );
              client.send(
                JSON.stringify({
                  type: "participant_ready_to_receive",
                  from: data.from,
                  meetingId: meetingId,
                })
              );
            }
          });
        }

        // Handle participant_joined message
        if (data.type === "participant_joined") {
          console.log(
            `Participant ${data.participantId} joined meeting ${meetingId}`
          );

          // Notify all other clients in the same meeting
          wss.clients.forEach((client) => {
            if (
              client !== ws &&
              client.readyState === WebSocket.OPEN &&
              client.meetingId === meetingId
            ) {
              client.send(
                JSON.stringify({
                  type: "participant_joined",
                  participantId: data.participantId,
                  meetingId: meetingId,
                })
              );
            }
          });
        }

        // Handle chat messages
        if (data.type === "chat_message") {
          console.log(
            `Chat message from ${data.userId} in meeting ${meetingId}:`,
            data.message
          );

          // Broadcast chat message to all OTHER clients in the same meeting (not to sender)
          wss.clients.forEach((client) => {
            if (
              client !== ws &&
              client.readyState === WebSocket.OPEN &&
              client.meetingId === meetingId
            ) {
              client.send(
                JSON.stringify({
                  type: "chat_message",
                  messageId: data.messageId,
                  userId: data.userId,
                  username: data.username,
                  message: data.message,
                  messageType: data.messageType,
                  timestamp: data.timestamp,
                  meetingId: meetingId,
                })
              );
            }
          });
        }

        // Handle typing indicators
        if (data.type === "typing_start" || data.type === "typing_stop") {
          console.log(
            `Typing ${data.type} from ${data.userId} in meeting ${meetingId}`
          );

          // Broadcast typing indicator to all other clients in the same meeting
          wss.clients.forEach((client) => {
            if (
              client !== ws &&
              client.readyState === WebSocket.OPEN &&
              client.meetingId === meetingId
            ) {
              client.send(
                JSON.stringify({
                  type: data.type,
                  userId: data.userId,
                  username: data.username,
                  meetingId: meetingId,
                })
              );
            }
          });
        }

        // Handle screen sharing events
        if (data.type === "screen-share-start") {
          console.log(
            `Screen share started by ${data.userId} in meeting ${meetingId}`
          );

          // Broadcast screen share start to all other clients in the same meeting
          wss.clients.forEach((client) => {
            if (
              client !== ws &&
              client.readyState === WebSocket.OPEN &&
              client.meetingId === meetingId
            ) {
              client.send(
                JSON.stringify({
                  type: "screen-share-start",
                  userId: data.userId,
                  username: data.username,
                  meetingId: meetingId,
                  timestamp: data.timestamp,
                })
              );
            }
          });
        }

        // Handle screen share stream data
        if (data.type === "screen-share-stream") {
          console.log(
            `Screen share stream from ${data.userId} in meeting ${meetingId}`
          );

          // Broadcast screen share stream to all other clients in the same meeting
          wss.clients.forEach((client) => {
            if (
              client !== ws &&
              client.readyState === WebSocket.OPEN &&
              client.meetingId === meetingId
            ) {
              client.send(
                JSON.stringify({
                  type: "screen-share-stream",
                  userId: data.userId,
                  meetingId: meetingId,
                  imageData: data.imageData,
                  timestamp: data.timestamp,
                })
              );
            }
          });
        }

        if (data.type === "screen-share-stop") {
          console.log(
            `Screen share stopped by ${data.userId} in meeting ${meetingId}`
          );

          // Broadcast screen share stop to all other clients in the same meeting
          wss.clients.forEach((client) => {
            if (
              client !== ws &&
              client.readyState === WebSocket.OPEN &&
              client.meetingId === meetingId
            ) {
              client.send(
                JSON.stringify({
                  type: "screen-share-stopped",
                  userId: data.userId,
                  username: data.username,
                  meetingId: meetingId,
                  timestamp: data.timestamp,
                })
              );
            }
          });
        }

        if (data.type === "screen-share-producer-created") {
          console.log(
            `Screen share producer created by ${data.userId} in meeting ${meetingId}`
          );

          // Broadcast producer creation to all other clients in the same meeting
          wss.clients.forEach((client) => {
            if (
              client !== ws &&
              client.readyState === WebSocket.OPEN &&
              client.meetingId === meetingId
            ) {
              client.send(
                JSON.stringify({
                  type: "screen-share-producer-created",
                  userId: data.userId,
                  producerId: data.producerId,
                  kind: data.kind,
                  meetingId: meetingId,
                })
              );
            }
          });
        }

        if (data.type === "screen-share-producer-closed") {
          console.log(
            `Screen share producer closed by ${data.userId} in meeting ${meetingId}`
          );

          // Broadcast producer closure to all other clients in the same meeting
          wss.clients.forEach((client) => {
            if (
              client !== ws &&
              client.readyState === WebSocket.OPEN &&
              client.meetingId === meetingId
            ) {
              client.send(
                JSON.stringify({
                  type: "screen-share-producer-closed",
                  userId: data.userId,
                  producerId: data.producerId,
                  meetingId: meetingId,
                })
              );
            }
          });
        }

        // Handle meeting end
        if (data.type === "meeting-end") {
          console.log(
            `Meeting ended by ${data.userId} in meeting ${meetingId}`
          );

          // Broadcast meeting end to all clients in the same meeting
          wss.clients.forEach((client) => {
            if (
              client.readyState === WebSocket.OPEN &&
              client.meetingId === meetingId
            ) {
              client.send(
                JSON.stringify({
                  type: "meeting-ended",
                  userId: data.userId,
                  username: data.username,
                  meetingId: meetingId,
                  timestamp: new Date().toISOString(),
                })
              );
            }
          });
        }
      });
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  });

  // Handle client disconnect
  ws.on("close", (event) => {
    console.log(
      `WebSocket disconnected from meeting: ${meetingId}, user: ${ws.userId}, code: ${event.code}, reason: ${event.reason}`
    );

    // Notify other clients that this user left
    if (ws.userId) {
      wss.clients.forEach((client) => {
        if (
          client !== ws &&
          client.readyState === WebSocket.OPEN &&
          client.meetingId === meetingId
        ) {
          client.send(
            JSON.stringify({
              type: "participant_left",
              participantId: ws.userId,
              meetingId: meetingId,
            })
          );
        }
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
    origin: (origin, cb) => cb(null, true),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "PATCH"],
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
