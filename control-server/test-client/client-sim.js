// control-server/test-client/client-sim.js
const { io } = require("socket.io-client");

// Ganti URL sesuai control server kamu
const CONTROL_SERVER_URL = "ws://localhost:4000";

const socket = io(CONTROL_SERVER_URL, {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on("connect", () => {
  console.log(`🖥️ Connected to control server as ${socket.id}`);

  // Kirim data registrasi seperti PC sungguhan
  socket.emit("register", {
  hostname: "SIM-PC",
    user: "simuser",
    os: "SimulatedOS 1.0",
    token: "FAKE_TOKEN_FOR_TEST",
  });
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected from control server");
});

// Dengar event perintah dari admin
socket.on("command", (cmd) => {
  console.log(`⚙️ Received command: ${cmd}`);
});

// Simulasi kirim mirror frame setiap 5 detik
setInterval(() => {
  const frame = `FRAME_${Date.now()}`;
  socket.emit("mirror-frame", frame);
  console.log(`📸 Sending mirror frame: ${frame}`);
}, 5000);
