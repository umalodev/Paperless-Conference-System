// control-server/test-client/client-sim.js
const { io } = require("socket.io-client");

// Ganti URL sesuai control server kamu
const CONTROL_SERVER_URL = "ws://localhost:4000";

const socket = io(CONTROL_SERVER_URL, {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

let mirrorInterval = null;

// ================= CONNECT =================
socket.on("connect", () => {
  console.log(`✅ Connected to control server as ${socket.id}`);

  // Kirim data registrasi seperti PC sungguhan
  socket.emit("register", {
    hostname: "SIM-PC 2",
    user: "simuser",
    os: "SimulatedOS 1.0",
    token: "FAKE_TOKEN_FOR_TEST",
  });
});

// ================= DISCONNECT =================
socket.on("disconnect", () => {
  console.log("🔴 Disconnected from control server");
  stopMirror();
});

// ================= COMMAND HANDLER =================
socket.on("command", (cmd) => {
  console.log(`📩 Received command: ${cmd}`);

  switch (cmd) {
    case "mirror-start":
      startMirror();
      break;
    case "mirror-stop":
      stopMirror();
      break;
    case "lock":
      console.log("🔒 Simulated lock screen");
      break;
    case "unlock":
      console.log("🔓 Simulated unlock screen");
      break;
    case "shutdown":
      console.log("💀 Simulated shutdown");
      process.exit(0);
      break;
    case "restart":
      console.log("🔁 Simulated restart");
      break;
    default:
      console.log("❓ Unknown command");
  }
});

// ================= MIRROR CONTROL =================
function startMirror() {
  if (mirrorInterval) return;
  console.log("🪞 Mirror started");

  mirrorInterval = setInterval(() => {
    const frame = Buffer.from(`FRAME_${Date.now()}`).toString("base64");
    socket.emit("mirror-frame", frame);
    console.log(`🖼️ Sent mirror frame (${frame.slice(0, 20)}...)`);
  }, 5000);
}

function stopMirror() {
  if (mirrorInterval) {
    clearInterval(mirrorInterval);
    mirrorInterval = null;
    console.log("🛑 Mirror stopped");
  }
}
