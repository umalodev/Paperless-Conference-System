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
  const { hostname, user, os, token, displayName, account: clientAccount, role } = data;

  // ✅ skip non-device
  if (role && role !== "device") {
    console.log(`ℹ️ Non-device client (${role}) connected: ${hostname || socket.id}`);
    socket.data.isDevice = false;
    return;
  }

  socket.data.isDevice = true;
  let account = clientAccount || null;

  console.log("\n📩 Register data received:", data);

  // === Token Validation ===
  if (token) {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.data.success) throw new Error("Invalid token");
      account = {
        ...res.data.user,
        displayName: displayName || res.data.user.displayName || res.data.user.username
      };
    } catch (e) {
      console.warn("⚠️ Token invalid — rejecting registration:", e.message);
      socket.emit("force-disconnect", "Invalid authentication");
      socket.disconnect(true);
      return;
    }
  }


  // === Cari participant dengan hostname / username sama ===
  let existingKey = Object.keys(participants).find((id) => {
    const p = participants[id];
    if (!p) return false;
    return (
      p.hostname?.toLowerCase() === hostname?.toLowerCase() ||
      p.account?.username === account?.username
    );
  });

  if (existingKey) {
    // 🧠 Jika socket.id berubah → migrasikan
    if (existingKey !== socket.id) {
      console.log(`🔁 Migrating participant ${hostname} to new socket ID`);
      const old = participants[existingKey];
      delete participants[existingKey];
      participants[socket.id] = { ...old, id: socket.id, os, user, hostname, account };
    } else {
      participants[existingKey] = { ...participants[existingKey], os, user, hostname, account };
    }
  } else {
    participants[socket.id] = {
      id: socket.id,
      hostname,
      user,
      os,
      account,
      isLocked: false,
    };
    console.log(`🆕 Registered new participant: ${hostname}`);
  }

  io.emit("participants", Object.values(participants));
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
    console.log(`🔴 Disconnected: ${socket.id}`);
    if (socket.data?.isDevice) {
      delete participants[socket.id];
      io.emit("participants", Object.values(participants));
    } else {
      console.log("ℹ️ Skipping non-device disconnect cleanup");
    }
  });

  // ================= LATENCY CHECK (PING / PONG) =================
  socket.on("ping-check", (data) => {
    socket.emit("pong-check", { ts: data.ts });
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
