const path = require("path");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const http = require("http");
const WebSocket = require("ws");
const routes = require("./routes");

const app = express();
const server = http.createServer(app);
const PORT = 3000;

const UPLOAD_DIR = path.resolve(__dirname, "../uploads");

// WebSocket server for meeting rooms
const wss = new WebSocket.Server({ server });

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
  console.log("New WebSocket connection established");

  // Extract meeting ID from URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const meetingId = url.pathname.split("/")[2]; // /meeting/{meetingId}

  if (!meetingId) {
    console.log("No meeting ID provided, closing connection");
    ws.close();
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

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173", // Frontend URL
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-User-Id"],
    exposedHeaders: ["Set-Cookie"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: "paperless-conference-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "lax", // Better for cross-origin requests
      path: "/",
    },
    name: "paperless-session", // Custom session name
  })
);

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
    server.listen(PORT, () => {
      console.log(`Backend running at http://localhost:${PORT}`);
      console.log(`API endpoints available at http://localhost:${PORT}/api`);
      console.log(
        `WebSocket server available at ws://localhost:${PORT}/meeting/{meetingId}`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
