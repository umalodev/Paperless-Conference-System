// preload.ts
import { contextBridge, desktopCapturer, ipcRenderer } from "electron";
import os from "os";
import { exec } from "child_process";
import { io } from "socket.io-client";

// ====== CONFIGURABLE ======
const CONTROL_SERVER = "http://192.168.1.5:4000"; // Ganti sesuai IP server
const MIRROR_FPS = 2; // frame per detik

// ====== SOCKET.IO CLIENT ======
const socket = io(CONTROL_SERVER, { transports: ["websocket"] });

// === Helper ambil token & displayName dari localStorage ===
function getToken() {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

function getDisplayName() {
  try {
    return localStorage.getItem("pconf.displayName") || "";
  } catch {
    return "";
  }
}

// === Saat connect ke control server ===
socket.on("connect", () => {
  console.log("✅ Connected to Control Server:", socket.id);

  // otomatis kirim register (agar selalu muncul di participants)
  const hostname = os.hostname();
  const user = os.userInfo().username;
  const platform = os.platform();
  const token = getToken();
  const displayName = getDisplayName();

  const payload: any = { hostname, user, os: platform, token, displayName };
  socket.emit("register", payload);
  console.log("[preload] Auto-registering participant:", payload);
});

// === Manual register dari React (misal dipanggil dari Start.jsx) ===
async function registerToControlServer(token?: string, displayName?: string) {
  const hostname = os.hostname();
  const user = os.userInfo().username;
  const platform = os.platform();
  const payload: any = { hostname, user, os: platform };

  if (token) payload.token = token;
  if (displayName) payload.displayName = displayName;

  socket.emit("register", payload);
  console.log("[preload] ✅ Sent register payload manually:", payload);
}

// === Auto re-register on reconnect ===
socket.io.on("reconnect", () => {
  console.log("🔄 Reconnected — re-registering...");
  const hostname = os.hostname();
  const user = os.userInfo().username;
  const platform = os.platform();
  const token = getToken();
  const displayName = getDisplayName();

  const payload: any = { hostname, user, os: platform, token, displayName };
  socket.emit("register", payload);
});

// =====================================================
// 🧩 COMMAND HANDLING
// =====================================================
socket.on("command", async (cmd: string) => {
  console.log("Received command:", cmd);
  switch (cmd) {
    case "lock":
      ipcRenderer.send("show-lock-overlay");
      break;
    case "unlock":
      ipcRenderer.send("hide-lock-overlay");
      break;
    case "shutdown":
      exec("shutdown /s /t 0");
      break;
    case "reboot":
    case "restart":
      exec("shutdown /r /t 0");
      break;
    case "mirror-start":
      startMirror();
      break;
    case "mirror-stop":
      stopMirror();
      break;
    default:
      console.log("Unknown command:", cmd);
  }
});

// =====================================================
// 🧱 LOCK / UNLOCK — overlay freeze
// =====================================================
let isLocked = false;
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

socket.on("lock-screen", () => {
  if (isLocked) return;
  isLocked = true;
  ipcRenderer.send("show-lock-overlay");
});
socket.on("unlock-screen", () => {
  if (!isLocked) return;
  isLocked = false;
  ipcRenderer.send("hide-lock-overlay");
});

// =====================================================
// 🪞 SCREEN MIRROR STREAM
// =====================================================
let mirrorInterval: number | null = null;

async function startMirror() {
  if (mirrorInterval) return;
  console.log("[mirror] Started");
  mirrorInterval = window.setInterval(async () => {
    try {
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
  const sources = await desktopCapturer.getSources({ types: ["screen", "window"] });
  return sources.map((s) => ({ id: s.id, name: s.name }));
}

// =====================================================
// 🌍 EXPOSE TO RENDERER
// =====================================================
contextBridge.exposeInMainWorld("electronAPI", {
  getPCInfo: () => ({ hostname: os.hostname(), os: os.platform() }),
  registerToControlServer,
});

contextBridge.exposeInMainWorld("screenAPI", {
  isElectron: true,
  getScreenSources,
  startMirror,
  stopMirror,
});

contextBridge.exposeInMainWorld("ipc", {
  on: (...args: Parameters<typeof ipcRenderer.on>) => ipcRenderer.on(...args),
  off: (...args: Parameters<typeof ipcRenderer.off>) => ipcRenderer.off(...args),
  send: (...args: Parameters<typeof ipcRenderer.send>) => ipcRenderer.send(...args),
  invoke: (...args: Parameters<typeof ipcRenderer.invoke>) => ipcRenderer.invoke(...args),
});

(globalThis as any).__PRELOAD_OK__ = true;
console.log("[preload] electronAPI & screenAPI exposed successfully");
