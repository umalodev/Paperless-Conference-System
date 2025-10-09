// control-server/test-client/multi-sim.js
const { io } = require("socket.io-client");

const CONTROL_SERVER_URL = "ws://localhost:4000";

// Boleh atur jumlah simulasi dari CLI (contoh: node multi-sim.js 100)
const TOTAL_CLIENTS = parseInt(process.argv[2], 10) || 50;
const CONNECT_DELAY_MS = 200; // jeda antar koneksi biar server tidak kejang

console.log(`🚀 Starting ${TOTAL_CLIENTS} simulated clients...\n`);

(async function startSimulation() {
  for (let i = 1; i <= TOTAL_CLIENTS; i++) {
    setTimeout(() => createSimClient(i), i * CONNECT_DELAY_MS);
  }
})();

function createSimClient(index) {
  const socket = io(CONTROL_SERVER_URL, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 2000,
  });

  let mirrorInterval = null;

  socket.on("connect", () => {
    const simulatedAccount = {
      id: 100 + index,
      username: `simuser${index}`,
      role: "participant",
      created_at: new Date().toISOString(),
      displayName: `Sim Display ${index}`,
    };

    const payload = {
      hostname: `SIM-PC-${index}`,
      user: `SimUser-${index}`,
      os: "win32",
      account: simulatedAccount,
      isLocked: false,
    };

    socket.emit("register", payload);
    console.log(`✅ [SIM ${index}] Connected & Registered`);
  });

  socket.on("disconnect", (reason) => {
    console.log(`🔴 [SIM ${index}] Disconnected: ${reason}`);
    stopMirror();
  });

  socket.on("connect_error", (err) => {
    console.error(`⚠️ [SIM ${index}] Connection error: ${err.message}`);
  });

  socket.on("command", (cmd) => {
    console.log(`📩 [SIM ${index}] Received command: ${cmd}`);
    if (cmd === "mirror-start") startMirror();
    if (cmd === "mirror-stop") stopMirror();
  });

  function startMirror() {
    if (mirrorInterval) return;
    console.log(`🪞 [SIM ${index}] Mirror started`);
    mirrorInterval = setInterval(() => {
      const frameData = `SIM_${index}_${Date.now()}`;
      const frame = Buffer.from(frameData).toString("base64");
      socket.emit("mirror-frame", { from: socket.id, frame });
    }, 2000);
  }

  function stopMirror() {
    if (mirrorInterval) {
      clearInterval(mirrorInterval);
      mirrorInterval = null;
      console.log(`🛑 [SIM ${index}] Mirror stopped`);
    }
  }
}
