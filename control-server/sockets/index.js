const { Server } = require("socket.io");
const { registerControlSocket } = require("./controlSocket");

function initSocket(server, BACKEND_URL) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Global registry
  global.io = io;
  global.participants = {};
  global.config = { BACKEND_URL };

  io.on("connection", (socket) => {
    console.log(`🟢 Control client connected: ${socket.id}`);
    registerControlSocket(io, socket); // ⬅️ panggil handler dari file lain
  });

  return io;
}

module.exports = { initSocket };
