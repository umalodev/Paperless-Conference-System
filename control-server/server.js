// =========================================================
// 🖥️ CONTROL SERVER ENTRY
// =========================================================
const express = require("express");
const http = require("http");
const cors = require("cors");
require("dotenv").config();

const controlRoutes = require("./routes/controlRoutes");
const { initSocket } = require("./sockets"); // ⬅️ ambil init socket

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

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/control", controlRoutes);
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    totalParticipants: Object.keys(global.participants || {}).length || 0,
  });
});

// =========================================================
// 🔌 INIT SOCKET.IO
// =========================================================
initSocket(server, BACKEND_URL);

// =========================================================
// 🚀 START SERVER
// =========================================================
server.listen(PORT, () => {
  console.log(`✅ Control Server running on port ${PORT}`);
  console.log(`🌐 Socket.IO listening at ws://0.0.0.0:${PORT}`);
});
