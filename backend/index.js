// =========================================================
// index.js (versi Socket.IO modular & bersih)
// =========================================================

const path = require("path");
const express = require("express");
const cors = require("cors");
const http = require("http");
const os = require("os");
const { Server } = require("socket.io");
const { verifyToken } = require("./utils/jwt");
const sequelize = require("./db/db");
const models = require("./models");
const {
  startMidnightClearAllChatsJob,
} = require("./jobs/midnightClearAllChats");

// =========================================================
// ⚙️ Server Setup
// =========================================================
const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const UPLOAD_DIR = path.resolve(__dirname, "uploads");

// =========================================================
// 🌐 Helper: Dapatkan semua IP LAN untuk log
// =========================================================
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

// =========================================================
// 🔒 Build daftar origin yang diizinkan (CORS)
// =========================================================
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

// =========================================================
// 🔌 Socket.IO Initialization
// =========================================================
const io = new Server(server, {
  path: "/meeting",
  cors: {
    origin: (origin, cb) => {
      if (!origin || origin === "null" || origin.startsWith("file://"))
        return cb(null, true); // ✅ izinkan app Electron
      if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
      cb(new Error("CORS not allowed: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

global.wss = io;
module.exports.getWebSocketServer = () => io;

// =========================================================
// 🧩 Meeting Helper (dipakai di socket aggregator)
// =========================================================
const meetingState = new Map();
function getMeeting(meetingId) {
  if (!meetingState.has(meetingId)) {
    meetingState.set(meetingId, { sharerId: null });
  }
  return meetingState.get(meetingId);
}

function roomName(meetingId) {
  return `meeting:${meetingId}`;
}

function broadcastToMeeting(meetingId, payload, exceptSocket = null) {
  const room = roomName(meetingId);
  if (exceptSocket) exceptSocket.to(room).emit("message", payload);
  else io.to(room).emit("message", payload);
}

const validateMeetingStatus = async (meetingId) => {
  try {
    const meeting = await models.Meeting.findByPk(meetingId);
    if (!meeting) return false;
    if (meeting.status !== "active" && meeting.status !== "started")
      return false;

    const hostParticipant = await models.MeetingParticipant.findOne({
      where: { meetingId, role: "host", flag: "Y" },
    });
    if (!hostParticipant) return false;

    return true;
  } catch (error) {
    console.error(`Error validating meeting ${meetingId}:`, error);
    return false;
  }
};

// =========================================================
// 🧠 Socket Aggregator (semua socket modular di sini)
// =========================================================
const setupAllSockets = require("./sockets");
setupAllSockets(
  io,
  models,
  validateMeetingStatus,
  broadcastToMeeting,
  roomName
);

// =========================================================
// 🚀 Express Middleware & Routes
// =========================================================
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || origin === "null" || origin.startsWith("file://"))
        return cb(null, true); // ✅ izinkan dari Electron
      if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
      cb(new Error("CORS not allowed: " + origin));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", require("./routes"));
app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    index: false,
    setHeaders: (res) =>
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"),
  })
);

// Error middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Endpoint tidak ditemukan" });
});

// =========================================================
// 🏁 Start Server
// =========================================================
(async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("✅ Database synced successfully");

    startMidnightClearAllChatsJob();
    console.log("🗓️  Scheduler 'clear chat' aktif (setiap 00:00 WIB)");

    server.listen(PORT, HOST, () => {
      console.log(`🚀 Backend listening at http://${HOST}:${PORT}`);
      console.log(`🌍 Local: http://localhost:${PORT}`);
      getLanIPs().forEach((ip) => {
        console.log(`- LAN: http://${ip}:${PORT}`);
        console.log(`  API: http://${ip}:${PORT}/api`);
        console.log(`  IO : ws://${ip}:${PORT}/meeting`);
      });
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
})();
