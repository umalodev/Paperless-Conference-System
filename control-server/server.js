// =========================================================
// 🖥️ CONTROL SERVER
// =========================================================
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const controlRoutes = require("./routes/controlRoutes");
const axios = require("axios");
require("dotenv").config();

// =========================================================
// ⚙️ CONFIGURATION
// =========================================================
const app = express();
const server = http.createServer(app);

const PORT = process.env.CONTROL_PORT || 4000;
const BACKEND_URL = process.env.BACKEND_URL;

console.log("====================================");
console.log("🚀 Control Server starting...");
console.log("BACKEND_URL:", BACKEND_URL);
console.log("PORT:", PORT);
console.log("====================================");

// =========================================================
// 🔌 SOCKET.IO SETUP
// =========================================================
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Global participants registry
const participants = {};

// =========================================================
// 🧠 SOCKET CONNECTION HANDLER
// =========================================================
io.on("connection", (socket) => {
  console.log(`🟢 Control client connected: ${socket.id}`);

  // ================= REGISTER =================
  socket.on("register", async (data) => {
    const { hostname, user, os, token } = data;
    let account = null;

    console.log("\n📩 Register data received:", data);
    console.log("🔑 Token from client:", token ? token.slice(0, 40) + "..." : "NONE");

    // 🔹 PRIORITY 1: last login (global sync)
    if (global.lastLogin && global.lastLogin.account) {
      account = global.lastLogin.account;
      console.log(`✅ Linked with last login: ${account.username}`);
    }
    // 🔹 PRIORITY 2: validate token via backend
    else if (token) {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        });
        if (response.data.success && response.data.user) {
          account = response.data.user;
          console.log(`✅ Authenticated via token: ${account.username} (${account.role})`);
        } else {
          console.warn("⚠️ Invalid token or user not found");
        }
      } catch (err) {
        console.error("❌ Error validating token:", err.response?.data || err.message);
      }
    } else {
      console.warn("⚠️ No token provided from Electron client");
    }

    // Simpan participant
    participants[socket.id] = {
      id: socket.id,
      hostname,
      user,
      os,
      account,
      isLocked: false, // default unlocked
    };

    // Broadcast ke semua admin dashboard
    io.emit("participants", Object.values(participants));

    console.log(`🧩 Registered participant: ${hostname} (${account?.username || "no account"})`);
  });

  // ================= MIRROR FRAME =================
  socket.on("mirror-frame", (frame) => {
    if (!frame) return;
    console.log(`🪞 Mirror frame received from ${socket.id}, size: ${frame.length}`);
    io.emit("mirror-frame", { from: socket.id, frame });
  });

  // ================= EXECUTE COMMAND =================
  socket.on("execute-command", (payload) => {
    const target = io.sockets.sockets.get(payload.targetId);
    if (!target) {
      console.warn(`⚠️ Target ${payload.targetId} not found`);
      return;
    }

    console.log(`📡 Sending command '${payload.command}' → ${payload.targetId}`);
    target.emit("command", payload.command);

    // Handle mirror stop
    if (payload.command === "mirror-stop") {
      io.emit("mirror-stop", { from: payload.targetId });
    }

    // ======== LOCK / UNLOCK HANDLER ========
    if (payload.command === "lock") {
      console.log(`🔒 Locking PC ${payload.targetId}`);
      participants[payload.targetId].isLocked = true;
      target.emit("lock-screen");
      io.emit("participant-lock", { id: payload.targetId, isLocked: true });
    }

    if (payload.command === "unlock") {
      console.log(`🔓 Unlocking PC ${payload.targetId}`);
      participants[payload.targetId].isLocked = false;
      target.emit("unlock-screen");
      io.emit("participant-lock", { id: payload.targetId, isLocked: false });
    }
  });

  // ================= DISCONNECT =================
  socket.on("disconnect", () => {
    console.log(`🔴 Participant disconnected: ${socket.id}`);
    delete participants[socket.id];
    io.emit("participants", Object.values(participants));
  });
});

// =========================================================
// 🌐 EXPRESS ROUTES
// =========================================================
app.use(cors());
app.use(express.json());
app.use("/api/control", controlRoutes);

// Simple health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    totalParticipants: Object.keys(participants).length,
  });
});

// =========================================================
// 🚀 START SERVER
// =========================================================
server.listen(PORT, () => {
  console.log(`✅ Control Server running on port ${PORT}`);
  console.log(`🌐 Socket.IO listening at ws://0.0.0.0:${PORT}`);
});

// =========================================================
// 🌍 EXPORT GLOBALS
// =========================================================
global.io = io;
global.participants = participants;
global.config = { BACKEND_URL, PORT };
