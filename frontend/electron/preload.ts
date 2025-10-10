// preload.ts
import { contextBridge, desktopCapturer, ipcRenderer } from "electron";
import os from "os";
import { exec } from "child_process";
import { io, Socket } from "socket.io-client";

// ====== CONFIGURABLE ======
const CONTROL_SERVER = "http://192.168.1.23:4000"; // Ganti sesuai IP server
const MIRROR_FPS = 2; // frame per detik

// ====== STATE ======
let socket: Socket | null = null;
let mirrorInterval: number | null = null;
let isLocked = false;

// =====================================================
// 🧩 SOCKET CONNECTION (Manual connect via Start.jsx)
// =====================================================
function connectToControlServer(token?: string, displayName?: string) {
  // Jika sudah terkoneksi, jangan buat ulang
  if (socket && socket.connected) {
    console.log("[preload] Socket already connected as", socket.id);
    return;
  }

  console.log("[preload] Connecting to Control Server...");
  socket = io(CONTROL_SERVER, {
    transports: ["websocket"],
    reconnection: true,
    autoConnect: true, // pastikan socket benar-benar connect
  });

  // === CONNECTED ===
  socket.on("connect", () => {
    console.log("✅ Connected to Control Server:", socket!.id);

    const hostname = os.hostname();
    const user = os.userInfo().username;
    const platform = os.platform();
    const payload = { hostname, user, os: platform, token, displayName, role: "device" }; 

    // Kirim register setelah koneksi benar-benar terbentuk
    socket!.emit("register", payload);
    console.log("[preload] Registered participant:", payload);
  });

  socket.io.on("reconnect", () => {
    const hostname = os.hostname();
    const user = os.userInfo().username;
    const platform = os.platform();
    const payload = { hostname, user, os: platform, token, displayName, role: "device" }; 
    socket!.emit("register", payload);
  });


  // === ERROR HANDLER ===
  socket.on("connect_error", (err) => {
    console.error("❌ Socket connection error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.warn("🔴 Disconnected from Control Server:", reason);
  });

  // === RECONNECT ===
  socket.io.on("reconnect", (attempt) => {
    console.log(`🔄 Reconnected after ${attempt} attempts`);
    const hostname = os.hostname();
    const user = os.userInfo().username;
    const platform = os.platform();
    const payload = { hostname, user, os: platform, token, displayName };
    socket!.emit("register", payload);
  });

  // === DEBUG: lihat semua event dari server ===
  socket.onAny((event, data) => {
    if (event !== "mirror-frame") {
      console.log(`[socket event] ${event}`, data);
    }
  });

  // === REMOTE INPUT HANDLER ===
  socket.on("remote-input", (data) => {
    try {
      console.log("[remote] Input received:", data);

      // Gunakan Node.js child_process / robotjs
      const { type, action, x, y, key } = data;

      // ✅ Mouse control
      if (type === "mouse") {
        const robot = require("robotjs");
        if (action === "move") robot.moveMouse(x, y);
        if (action === "click") robot.mouseClick();
        if (action === "right-click") robot.mouseClick("right");
        if (action === "scroll") robot.scrollMouse(x, y);
      }

      // ✅ Keyboard control
      if (type === "keyboard" && key) {
        const robot = require("robotjs");
        robot.keyTap(key);
      }

    } catch (err) {
      console.error("[remote] Error handling input:", err);
    }
  });


  // === COMMAND HANDLER ===
  socket.on("command", handleCommand);
}


function disconnectFromControlServer() {
  if (socket && socket.connected) {
    console.log("[preload] Disconnecting from Control Server:", socket.id);
    socket.disconnect();
    socket = null;
  } else {
    console.log("[preload] No active socket to disconnect");
  }
}


// =====================================================
// 🧩 COMMAND HANDLER
// =====================================================
function handleCommand(cmd: string) {
  console.log("Received command:", cmd);
  switch (cmd) {
    case "lock":
      if (!isLocked) {
        ipcRenderer.send("show-lock-overlay");
        isLocked = true;
      }
      break;
    case "unlock":
      if (isLocked) {
        ipcRenderer.send("hide-lock-overlay");
        isLocked = false;
      }
      break;
    case "shutdown":
      console.warn("[preload] 🔻 Shutdown command received");
      if (socket && socket.connected) {
        socket.emit("status", { message: "Shutting down..." });
        socket.disconnect();
      }
      exec("shutdown /s /t 0");
      break;
    case "reboot":
    case "restart":
      console.warn("[preload] 🔁 Restart command received");
      if (socket && socket.connected) {
        socket.emit("status", { message: "Restarting..." });
        socket.disconnect();
      }
      exec("shutdown /r /t 0");
      break;
    case "mirror-start":
      if (!mirrorInterval) {
        console.log("[mirror] start triggered by command");
        startMirror();
      }
      break;
    case "mirror-stop":
      if (mirrorInterval) {
        console.log("[mirror] stop triggered by command");
        stopMirror();
      }
      break;
    default:
      console.log("Unknown command:", cmd);
  }
}


// =====================================================
// 🧱 LOCK / UNLOCK — overlay freeze
// =====================================================
function preventInput(e: Event) {
  if (isLocked) {
    e.stopPropagation();
    e.preventDefault();
  }
}
window.addEventListener("keydown", preventInput, true);
window.addEventListener("mousedown", preventInput, true);
window.addEventListener("mousemove", preventInput, true);
window.addEventListener("contextmenu", preventInput, true);

// =====================================================
// 🪞 SCREEN MIRROR STREAM
// =====================================================
async function startMirror() {
  if (mirrorInterval) return;
  console.log("[mirror] Started");
  mirrorInterval = window.setInterval(async () => {
    try {
      if (!socket || !socket.connected) return;
      const img = await ipcRenderer.invoke("capture-screen");
      if (!img) return;
      socket.emit("mirror-frame", img);
    } catch (err) {
      console.error("Mirror error:", err);
    }
  }, 1000 / MIRROR_FPS);
}

function stopMirror() {
  if (mirrorInterval) {
    clearInterval(mirrorInterval);
    mirrorInterval = null;
    console.log("[mirror] Stopped");
  }
}

// =====================================================
// 🧰 SCREEN CAPTURE HELPERS
// =====================================================
async function getScreenSources() {
  const sources = await desktopCapturer.getSources({
    types: ["screen", "window"],
  });
  return sources.map((s) => ({ id: s.id, name: s.name }));
}

// =====================================================
// 🌍 EXPOSE TO RENDERER
// =====================================================
contextBridge.exposeInMainWorld("electronAPI", {
  getPCInfo: () => ({ hostname: os.hostname(), os: os.platform() }),
  connectToControlServer, // dipanggil dari Start.jsx setelah user isi displayName
  disconnectFromControlServer,
});

contextBridge.exposeInMainWorld("screenAPI", {
  isElectron: true,
  getScreenSources,
  startMirror,
  stopMirror,
});

contextBridge.exposeInMainWorld("ipc", {
  on: (...args: Parameters<typeof ipcRenderer.on>) => ipcRenderer.on(...args),
  off: (...args: Parameters<typeof ipcRenderer.off>) =>
    ipcRenderer.off(...args),
  send: (...args: Parameters<typeof ipcRenderer.send>) =>
    ipcRenderer.send(...args),
  invoke: (...args: Parameters<typeof ipcRenderer.invoke>) =>
    ipcRenderer.invoke(...args),
});

(globalThis as any).__PRELOAD_OK__ = true;
console.log("[preload] electronAPI & screenAPI exposed successfully");
