const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const controlRoutes = require("./routes/controlRoutes");
const axios = require("axios");

// ====== CONFIGURATION ======
require("dotenv").config();
const app = express();
const server = http.createServer(app);

// Gunakan PORT dan BACKEND_URL dari .env
const PORT = process.env.CONTROL_PORT || 4000;
const BACKEND_URL = process.env.BACKEND_URL;

console.log("BACKEND_URL:", BACKEND_URL);

// ====== Socket.IO setup ======
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ====== Global participant list ======
const participants = {};

// ====== SOCKET CONNECTION HANDLER ======
io.on("connection", (socket) => {
  console.log(`Control client connected: ${socket.id}`);

  // ================= REGISTER =================
  socket.on("register", async (data) => {
    const { hostname, user, os, token } = data;
    let account = null;

    console.log("Register data received:", data);
    console.log("Token from client:", token ? token.slice(0, 40) + "..." : "NONE");

    // 🔹 PRIORITY 1: pakai data login terakhir (sync dari backend)
    if (global.lastLogin && global.lastLogin.account) {
      account = global.lastLogin.account;
      console.log(`Linked participant with last login: ${account.username}`);
    }

    // 🔹 PRIORITY 2: validasi token langsung ke backend
    else if (token) {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        });

        if (response.data.success && response.data.user) {
          account = response.data.user;
          console.log(`Authenticated via token: ${account.username} (${account.role})`);
        } else {
          console.warn("Invalid token or user not found");
        }
      } catch (err) {
        console.error("Error validating token:", err.response?.data || err.message);
      }
    } else {
      console.warn("No token provided from Electron");
    }

    // Simpan participant
    participants[socket.id] = { id: socket.id, hostname, user, os, account };
    io.emit("participants", Object.values(participants));

    console.log(`Registered participant: ${hostname} (${account?.username || "no account"})`);
  });

  // ================= MIRROR FRAME =================
  socket.on("mirror-frame", (frame) => {
    if (!frame) return;
    console.log(`Mirror frame received from ${socket.id}, size: ${frame.length}`);
    
    // Broadcast ke semua (termasuk admin dashboard)
    io.emit("mirror-frame", { from: socket.id, frame });
  });


  // ================= EXECUTE COMMAND =================
  socket.on("execute-command", (payload) => {
    const target = io.sockets.sockets.get(payload.targetId);
    if (target) {
      console.log(`Sending command '${payload.command}' to ${payload.targetId}`);
      target.emit("command", payload.command);
      if (payload.command === "mirror-stop") {
        // Broadcast ke semua client bahwa mirror user ini sudah berhenti
        io.emit("mirror-stop", { from: payload.targetId });
      }
    } else {
      console.warn(`Target ${payload.targetId} not found`);
    }
  });

  // ================= DISCONNECT =================
  socket.on("disconnect", () => {
    console.log(`Participant disconnected: ${socket.id}`);
    delete participants[socket.id];
    io.emit("participants", Object.values(participants));
  });
});

// ====== EXPRESS setup ======
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/control", controlRoutes);

// ====== Health Check ======
app.get("/health", (req, res) => {
  res.json({ status: "OK", totalParticipants: Object.keys(participants).length });
});

// ====== Start Server ======
server.listen(PORT, () => {
  console.log(`Control Server running on port ${PORT}`);
  console.log(`Socket.IO listening at ws://0.0.0.0:${PORT}`);
});

// ====== Export globals ======
global.io = io;
global.participants = participants;
global.config = { BACKEND_URL, PORT };
