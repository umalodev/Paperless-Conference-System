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

    if (!meetingId) {
      console.log("No meeting ID provided, closing connection");
      socket.emit("error", { code: 4001, message: "No meetingId" });
      socket.disconnect(true);
      return;
    }

    // Auth (verifyToken)
    try {
      if (!token) throw new Error("No token");
      const payload = verifyToken(token);
      socket.data.user = {
        id: payload.id,
        username: payload.username,
        role: payload.role,
      };
    } catch {
      console.log("Socket.IO auth failed");
      socket.emit("error", { code: 4401, message: "Unauthorized" });
      socket.disconnect(true);
      return;
    }

    // Validasi meeting
    const isValid = await validateMeetingStatus(meetingId);
    if (!isValid) {
      socket.emit("error", { code: 4403, message: "Meeting invalid" });
      socket.disconnect(true);
      return;
    }

    // Simpan identitas dasar
    socket.data.meetingId = String(meetingId);
    socket.data.userId =
      socket.data?.user?.id != null ? String(socket.data.user.id) : null;

    // Masuk room khusus meeting
    const room = roomName(socket.data.meetingId);
    await socket.join(room);

    console.log(
      `Socket connected to meeting: ${socket.data.meetingId}, user: ${socket.data.userId}, sid: ${socket.id}`
    );

    // ====== Handler "message" (compat dengan payload JSON sebelumnya) ======
    socket.on("message", async (message) => {
      try {
        // Izinkan payload sudah berupa object atau string JSON
        const data = typeof message === "string" ? JSON.parse(message) : message;
        const meetingId = socket.data.meetingId;

        // Set userId jika ada participantId dari payload pertama
        if (data.participantId && !socket.data.userId) {
          socket.data.userId = String(data.participantId);
          console.log(
            `User ${data.participantId} identified in meeting ${meetingId}`
          );
        }

        // Validasi meeting setiap pesan (sesuai versi lama)
        const stillValid = await validateMeetingStatus(meetingId);
        if (!stillValid) {
          console.log(`Meeting ${meetingId} is not valid, disconnecting`);
          socket.emit("error", { code: 4403, message: "Meeting invalid" });
          socket.disconnect(true);
          return;
        }

        // === Routing event berdasarkan data.type (mirror logic lama) ===

        // Broadcast generic ke peserta meeting lain (bukan pengirim)
        const broadcastGeneric = () => {
          broadcastToMeeting(meetingId, data, socket);
        };

        // Khusus: participant_ready_to_receive
        if (data.type === "participant_ready_to_receive") {
          console.log(
            `Participant ${data.from} is ready to receive video in meeting ${meetingId}`
          );
          broadcastToMeeting(
            meetingId,
            {
              type: "participant_ready_to_receive",
              from: data.from,
              meetingId,
            },
            socket
          );
          return;
        }

        // Khusus: participant_joined
        if (data.type === "participant_joined") {
          console.log(
            `Participant ${data.participantId} joined meeting ${meetingId}`
          );
          broadcastToMeeting(
            meetingId,
            {
              type: "participant_joined",
              participantId: data.participantId,
              meetingId,
            },
            socket
          );
          return;
        }

        // Khusus: chat_message
        if (data.type === "chat_message") {
          console.log(
            `Chat message from ${data.userId} in meeting ${meetingId}:`,
            data.message
          );
          broadcastToMeeting(
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
            socket
          );
          return;
        }

        // Khusus: typing indicators
        if (data.type === "typing_start" || data.type === "typing_stop") {
          console.log(
            `Typing ${data.type} from ${data.userId} in meeting ${meetingId}`
          );
          broadcastToMeeting(
            meetingId,
            {
              type: data.type,
              userId: data.userId,
              username: data.username,
              meetingId,
            },
            socket
          );
          return;
        }

        // Screen share: start/stream/stop & producer created/closed
        if (data.type === "screen-share-start") {
          console.log(
            `Screen share started by ${data.userId} in meeting ${meetingId}`
          );
          broadcastToMeeting(
            meetingId,
            {
              type: "screen-share-start",
              userId: data.userId,
              username: data.username,
              meetingId,
              timestamp: data.timestamp,
            },
            socket
          );
          return;
        }

        if (data.type === "screen-share-stream") {
          // per frame image data
          broadcastToMeeting(
            meetingId,
            {
              type: "screen-share-stream",
              userId: data.userId,
              meetingId,
              imageData: data.imageData,
              timestamp: data.timestamp,
            },
            socket
          );
          return;
        }

        if (data.type === "screen-share-stop") {
          console.log(
            `Screen share stopped by ${data.userId} in meeting ${meetingId}`
          );
          broadcastToMeeting(
            meetingId,
            {
              type: "screen-share-stopped",
              userId: data.userId,
              username: data.username,
              meetingId,
              timestamp: data.timestamp,
            },
            socket
          );
          return;
        }

        if (data.type === "screen-share-producer-created") {
          broadcastToMeeting(
            meetingId,
            {
              type: "screen-share-producer-created",
              userId: data.userId,
              producerId: data.producerId,
              kind: data.kind,
              meetingId,
            },
            socket
          );
          return;
        }

        if (data.type === "screen-share-producer-closed") {
          broadcastToMeeting(
            meetingId,
            {
              type: "screen-share-producer-closed",
              userId: data.userId,
              producerId: data.producerId,
              meetingId,
            },
            socket
          );
          return;
        }

        // ====== State machine sederhana untuk sharer (seperti versi lama) ======
        const m = getMeeting(meetingId);
        switch (data.type) {
          case "screen_share_start":
            m.sharerId = data.from || socket.data.userId;
            break;
          case "screen_share_stop":
            if (!m.sharerId || m.sharerId === (data.from || socket.data.userId)) {
              m.sharerId = null;
            }
            break;
          case "anno:preview":
          case "anno:commit":
          case "anno:clear":
          case "anno:undo":
          case "anno:redo": {
            // forward ke peserta lain di meeting yang sama (kecuali sender)
            broadcastToMeeting(
              meetingId,
              { ...data, from: data.from || socket.data.userId },
              socket
            );
            return;
          }
        }

        // Khusus: annotate (versi lama mengubah ke "anno:commit" utk viewer & sharer)
        if (data.type === "annotate") {
          const meeting = getMeeting(meetingId);
          io.sockets.adapter.rooms.get(roomName(meetingId)); // sentinel
          // Kirim ke semua viewer lain (kecuali pengirim), serta ke sharer (jika berbeda)
          // Dengan Socket.IO cukup broadcast biasa; sharer juga di room yang sama
          broadcastToMeeting(
            meetingId,
            {
              type: "anno:commit",
              userId: data.userId,
              meetingId,
              shape: data.shape,
            },
            socket
          );
          return;
        }

        // Meeting end
        if (data.type === "meeting-end") {
          console.log(
            `Meeting ended by ${data.userId} in meeting ${meetingId}`
          );
          broadcastToMeeting(meetingId, {
            type: "meeting-ended",
            userId: data.userId,
            username: data.username,
            meetingId,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Default: broadcast generic (kecuali pengirim), mempertahankan perilaku lama
        broadcastGeneric();
      } catch (err) {
        console.error("Error handling Socket.IO message:", err);
      }
    });

    // ====== Disconnect ======
    socket.on("disconnect", (reason) => {
      const meetingId = socket.data.meetingId;
      const userId = socket.data.userId || socket.data.user?.id;
      console.log(
        `Socket disconnected from meeting: ${meetingId}, user: ${userId}, sid: ${socket.id}, reason: ${reason}`
      );

      // Notify others bahwa user left
      if (userId) {
        broadcastToMeeting(meetingId, {
          type: "participant_left",
          participantId: userId,
          meetingId,
        });
      }

      // Jika yang disconnect adalah current sharer → force stop
      const m = getMeeting(meetingId);
      if (m && m.sharerId && String(m.sharerId) === String(userId)) {
        m.sharerId = null;
        broadcastToMeeting(meetingId, {
          type: "screen_share_force_stop",
          meetingId,
          byDisconnect: true,
          from: userId,
        });
      }
    });

    // (Opsional) error per-socket
    socket.on("error", (err) => {
      console.error(`Socket.IO error in meeting ${socket.data.meetingId}:`, err);
    });
  } catch (err) {
    console.error("Socket.IO connection error:", err);
    // Jika terjadi error sebelum join, putuskan koneksi
    try { socket.disconnect(true); } catch (_) {}
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
