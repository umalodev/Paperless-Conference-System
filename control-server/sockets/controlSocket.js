const axios = require("axios");

function registerControlSocket(io, socket) {
  const participants = global.participants;
  const BACKEND_URL = global.config.BACKEND_URL;

  // ================= REGISTER =================
  socket.on("register", async (data) => {
    const { hostname, user, os, token, displayName, account: clientAccount, role } = data;

    if (role && role !== "device") {
      console.log(`ℹ️ Non-device client (${role}) connected: ${hostname || socket.id}`);
      socket.data.isDevice = false;
      return;
    }

    socket.data.isDevice = true;
    let account = clientAccount || null;

    if (token) {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.data.success) throw new Error("Invalid token");
        account = { ...res.data.user, displayName: displayName || res.data.user.displayName };
      } catch (e) {
        console.warn("⚠️ Token invalid:", e.message);
        socket.emit("force-disconnect", "Invalid authentication");
        socket.disconnect(true);
        return;
      }
    }

    const existingKey = Object.keys(participants).find((id) => {
      const p = participants[id];
      return (
        p.hostname?.toLowerCase() === hostname?.toLowerCase() ||
        p.account?.username === account?.username
      );
    });

    if (existingKey) {
      if (existingKey !== socket.id) {
        console.log(`🔁 Migrating participant ${hostname} → new socket ID`);
        const old = participants[existingKey];
        delete participants[existingKey];
        participants[socket.id] = { ...old, id: socket.id, os, user, hostname, account };
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
    io.emit("mirror-frame", { from: socket.id, frame });
    socket.emit("mirror-ack");
  });

  // ================= EXECUTE COMMAND =================
  socket.on("execute-command", (payload) => {
    const target = io.sockets.sockets.get(payload.targetId);
    if (!target) return console.warn(`⚠️ Target ${payload.targetId} not found`);

    target.emit("command", payload.command);

    if (payload.command === "mirror-stop")
      io.emit("mirror-stop", { from: payload.targetId });

    if (payload.command === "lock" || payload.command === "unlock") {
      const isLock = payload.command === "lock";
      participants[payload.targetId].isLocked = isLock;
      target.emit(isLock ? "lock-screen" : "unlock-screen");
      io.emit("participant-lock", { id: payload.targetId, isLocked: isLock });
    }
  });

  // ================= DISCONNECT =================
  socket.on("disconnect", (reason) => {
    console.log(`🔴 Disconnected: ${socket.id} (${reason})`);
    if (socket.data?.isDevice) {
      delete participants[socket.id];
      io.emit("participants", Object.values(participants));
    }
  });

  // ================= LATENCY CHECK =================
  socket.on("ping-check", (data) => {
    socket.emit("pong-check", { ts: data.ts });
    if (participants[socket.id]) participants[socket.id].lastPing = Date.now();
  });

  // ================= HEARTBEAT =================
  const TIMEOUT_MS = 8000;
  setInterval(() => {
    const now = Date.now();
    let removed = 0;
    for (const id in participants) {
      const p = participants[id];
      if (!p.lastPing) continue;
      if (now - p.lastPing > TIMEOUT_MS) {
        console.warn(`⚠️ Timeout: ${p.hostname || id}`);
        delete participants[id];
        removed++;
      }
    }
    if (removed > 0) io.emit("participants", Object.values(participants));
  }, 5000);
}

module.exports = { registerControlSocket };
