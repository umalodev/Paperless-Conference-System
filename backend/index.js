// index.js (versi Socket.IO, drop-in menggantikan versi ws)

const path = require("path");
const express = require("express");
const cors = require("cors");
const { verifyToken } = require("./utils/jwt");
const http = require("http");
const os = require("os");

// ====== Express + HTTP Server ======
const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";

const UPLOAD_DIR = path.resolve(__dirname, "uploads");

// ====== Helper: LAN IPs ======
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

// ====== DB & Models ======
const sequelize = require("./db/db");
const models = require("./models");

// ====== Allowed Origins (dipakai CORS Express & Socket.IO) ======
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

// ====== Socket.IO Server ======
const { Server } = require("socket.io");

// Kita set path khusus "/meeting" supaya URL Socket.IO lebih dekat dengan skema lama.
// Client disarankan connect ke: io("http://host:port", { path: "/meeting", query: { token, meetingId } })
const io = new Server(server, {
  path: "/meeting",
  cors: {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
      return cb(new Error("CORS not allowed: " + origin), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

// Kompatibilitas untuk kode lain yang mungkin masih mengakses global.wss
global.wss = io;
module.exports.getWebSocketServer = () => io;

// ====== Meeting State (sharer tracking) ======
const meetingState = new Map();
function getMeeting(meetingId) {
  if (!meetingState.has(meetingId)) {
    meetingState.set(meetingId, { sharerId: null });
  }
  return meetingState.get(meetingId);
}

// Helper broadcast ke room meeting dengan pengecualian pengirim (jika ada)
function broadcastToMeeting(meetingId, payload, exceptSocket = null) {
  const room = roomName(meetingId);
  if (exceptSocket) {
    exceptSocket.to(room).emit("message", payload);
  } else {
    io.to(room).emit("message", payload);
  }
}

// Penamaan room konsisten
function roomName(meetingId) {
  return `meeting:${meetingId}`;
}

// ====== Validasi status meeting (tetap seperti sebelumnya) ======
const validateMeetingStatus = async (meetingId) => {
  try {
    // Check if meeting exists
    const meeting = await models.Meeting.findByPk(meetingId);
    if (!meeting) {
      console.log(`Meeting ${meetingId} not found`);
      return false;
    }

    // status harus active/started
    if (meeting.status !== "active" && meeting.status !== "started") {
      console.log(
        `Meeting ${meetingId} is not active/started (status: ${meeting.status})`
      );
      return false;
    }

    // cek host
    const hostParticipant = await models.MeetingParticipant.findOne({
      where: { meetingId, role: "host", flag: "Y" },
    });
    if (!hostParticipant) {
      console.log(`Meeting ${meetingId} has no host`);
      return false;
    }

    console.log(`Meeting ${meetingId} is valid for Socket.IO connection`);
    return true;
  } catch (error) {
    console.error(`Error validating meeting ${meetingId}:`, error);
    return false;
  }
};

// ====== Socket.IO connection handling ======
io.on("connection", async (socket) => {
  try {
    // Ambil token & meetingId dari query
    const q = socket.handshake.query || {};
    let token = q.token;
    let meetingId = q.meetingId;

    // Fallback: coba ekstrak meetingId dari URL/referrer jika format lama dipakai (/meeting/<id>?token=...)
    const tryExtract = (str) => {
      if (!str || typeof str !== "string") return null;
      const m = str.match(/\/meeting\/([^/?#]+)/i);
      return m ? m[1] : null;
    };
    if (!meetingId) {
      meetingId =
        tryExtract(socket.handshake.url) ||
        tryExtract(socket.handshake.headers?.referer);
    }

    if (!token || !meetingId) {
      console.log("❌ Missing token or meetingId, closing connection");
      socket.emit("error", { code: 4001, message: "Missing token or meetingId" });
      socket.disconnect(true);
      return;
    }

    // ===== AUTH =====
    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      socket.emit("error", { code: 4401, message: "Unauthorized" });
      socket.disconnect(true);
      return;
    }

    // ❗ Pastikan tidak ada koneksi lama untuk user yang sama
    for (const [sid, s] of io.sockets.sockets) {
      if (s.data?.userId === String(payload.id) && sid !== socket.id) {
        console.log(`⚠️ Duplicate connection found for user ${payload.username}, closing old one...`);
        s.disconnect(true); // tutup socket lama
      }
    }


    socket.data = {
      userId: String(payload.id),
      displayName: payload.username,
      meetingId: String(meetingId),
    };

    // ===== VALIDASI MEETING =====
    const isValid = await validateMeetingStatus(meetingId);
    if (!isValid) {
      socket.emit("error", { code: 4403, message: "Meeting invalid" });
      socket.disconnect(true);
      return;
    }

    // ===== SETUP DATA DASAR =====
    socket.data.meetingId = String(meetingId);
    socket.data.userId = String(payload.id);
    socket.data.displayName = payload.username;

    await socket.join(roomName(meetingId));
    console.log(`✅ User ${payload.username} joined meeting ${meetingId}`);

    // ===== KIRIM DAFTAR PESERTA AKTIF KE USER BARU =====
    const others = [];
        for (const [sid, s] of io.sockets.sockets) {
          if (s.data.meetingId === meetingId && sid !== socket.id) {
            others.push({
              participantId: s.data.userId,
              displayName: s.data.displayName,
            });
          }
        }
        socket.emit("message", { type: "participants_list", data: others });


    // ===== HANDLER JOIN-ROOM DARI CLIENT =====
socket.on("join-room", ({ meetingId, userId, displayName }) => {
  if (!meetingId || !userId) return;

  socket.data.meetingId = String(meetingId);
  socket.data.userId = String(userId);
  socket.data.displayName = displayName || payload.username;

  console.log(`✅ join-room: ${socket.data.displayName} joined meeting ${meetingId}`);

  // Kirim daftar peserta ke user baru
  const others = [];
  for (const [sid, s] of io.sockets.sockets) {
    if (s.data.meetingId === String(meetingId) && sid !== socket.id) {
      others.push({
        participantId: s.data.userId,
        displayName: s.data.displayName,
      });
    }
  }
  socket.emit("message", { type: "participants_list", data: others });

  // 💥 Broadcast ke peserta lain
  socket.to(roomName(meetingId)).emit("message", {
    type: "participant_joined",
    participantId: socket.data.userId,
    displayName: socket.data.displayName,
    joinedAt: Date.now(),
  });
});


    // ===== HANDLER PESAN =====
    socket.on("message", async (message) => {
      try {
        const data = typeof message === "string" ? JSON.parse(message) : message;
        const meetingId = socket.data.meetingId;

        // update ID jika belum ada
        if (data.participantId && !socket.data.userId) {
          socket.data.userId = String(data.participantId);
        }

        const stillValid = await validateMeetingStatus(meetingId);
        if (!stillValid) {
          socket.emit("error", { code: 4403, message: "Meeting invalid" });
          socket.disconnect(true);
          return;
        }

        // === Routing berdasarkan type ===
        const broadcastGeneric = () => broadcastToMeeting(meetingId, data, socket);

        // Chat
        if (data.type === "chat_message") {
          console.log(`💬 Chat from ${data.userId}: ${data.message}`);
          broadcastToMeeting(meetingId, data, socket);
          return;
        }

        // Typing indicators
        if (["typing_start", "typing_stop"].includes(data.type)) {
          broadcastToMeeting(meetingId, data, socket);
          return;
        }

        // Screen share
        if (
          ["screen-share-start", "screen-share-stream", "screen-share-stop"].includes(data.type)
        ) {
          broadcastToMeeting(meetingId, data, socket);
          return;
        }

        // Annotation
        if (["anno:preview", "anno:commit", "anno:clear", "anno:undo", "anno:redo"].includes(data.type)) {
          broadcastToMeeting(meetingId, { ...data, from: socket.data.userId }, socket);
          return;
        }

        if (data.type === "annotate") {
          broadcastToMeeting(
            meetingId,
            { type: "anno:commit", userId: data.userId, meetingId, shape: data.shape },
            socket
          );
          return;
        }

        // Meeting end
        if (data.type === "meeting-end") {
          broadcastToMeeting(meetingId, {
            type: "meeting-ended",
            userId: data.userId,
            username: data.username,
            meetingId,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Default: broadcast generic
        broadcastGeneric();
      } catch (err) {
        console.error("❌ Error handling Socket.IO message:", err);
      }
    });

    // ===== DISCONNECT HANDLER =====
socket.on("disconnect", reason => {
  const { meetingId, userId, displayName } = socket.data || {};
  console.log(`🔴 ${displayName} disconnected (${reason})`);

  // 🚪 Langsung broadcast ke peserta lain
  socket.to(roomName(meetingId)).emit("message", {
    type: "participant_left",
    participantId: userId,
    displayName,
  });
});




    // ===== ERROR HANDLER =====
    socket.on("error", (err) => {
      console.error(`⚠️ Socket.IO error in meeting ${socket.data.meetingId}:`, err);
    });
  } catch (err) {
    console.error("❌ Socket.IO connection error:", err);
    try {
      socket.disconnect(true);
    } catch (_) {}
  }
});


// ====== Express Middlewares ======
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

// Routes
const routes = require("./routes");
app.use("/api", routes);

// Static uploads
app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    index: false,
    setHeaders: (res) => {
      // agar PDF/gambar bisa dibuka lintas origin
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

// ====== Start server setelah sync DB ======
const startServer = async () => {
  try {
    await sequelize.sync({ force: false, alter: true });
    console.log("Database synced successfully - tables created/updated");

    server.listen(PORT, HOST, () => {
      const lans = getLanIPs();
      console.log(`Backend listening on ${HOST}:${PORT}`);
      console.log(`- Local:  http://localhost:${PORT}`);
      lans.forEach((ip) => {
        console.log(`- LAN:    http://${ip}:${PORT}`);
        console.log(`  API:    http://${ip}:${PORT}/api`);
        // Untuk Socket.IO, gunakan path "/meeting"
        console.log(`  IO:     ws://${ip}:${PORT}/meeting  (Socket.IO path)`);
        console.log(
          `         query: ?token=<JWT>&meetingId={meetingId} (disarankan)`
        );
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
