// preload.ts
import { contextBridge, desktopCapturer, ipcRenderer } from "electron";
import os from "os";
import { exec } from "child_process";
import screenshot from "screenshot-desktop";
import { io } from "socket.io-client";

// ====== CONFIGURABLE ======
const CONTROL_SERVER = "http://10.109.18.108:4000"; // Ganti sesuai IP server
const MIRROR_FPS = 1; // 1 frame per detik

// ====== SOCKET.IO CLIENT ======
const socket = io(CONTROL_SERVER, { transports: ["websocket"] });

// === Helper: ambil token login dari localStorage ===
function getToken() {
  try {
    return localStorage.getItem("token");
  } catch (err) {
    console.warn("[preload] Gagal ambil token:", err);
    return null;
  }
}

// === Saat connect ke control server ===
socket.on("connect", () => {
  console.log("Connected to Control Server:", socket.id);

  const hostname = os.hostname();
  const user = os.userInfo().username;
  const platform = os.platform();
  const token = getToken();

  const payload: any = { hostname, user, os: platform };
  if (token) payload.token = token;

  socket.emit("register", payload);
  console.log("[preload] Registering participant:", payload);
});

socket.on("disconnect", () => console.warn("Disconnected from Control Server"));
socket.io.on("reconnect", () => {
  console.log("Reconnected — re-registering...");
  const hostname = os.hostname();
  const user = os.userInfo().username;
  const platform = os.platform();
  const token = getToken();
  const payload: any = { hostname, user, os: platform };
  if (token) payload.token = token;
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
// 🧱 LOCK / UNLOCK — via IPC Overlay + Input Freeze
// =====================================================
let isLocked = false;

function preventInput(e: Event) {
  if (isLocked) {
    e.stopPropagation();
    e.preventDefault();
  }
}

// Register listener di awal
window.addEventListener("keydown", preventInput, true);
window.addEventListener("mousedown", preventInput, true);
window.addEventListener("mousemove", preventInput, true);
window.addEventListener("contextmenu", preventInput, true);

socket.on("lock-screen", () => {
  console.log("🔒 Received lock-screen event from admin");
  if (isLocked) return;
  isLocked = true;

  // Kirim ke renderer (React Overlay)
  ipcRenderer.send("show-lock-overlay");
});

socket.on("unlock-screen", () => {
  console.log("🔓 Received unlock-screen event from admin");
  if (!isLocked) return;
  isLocked = false;

  // Kirim ke renderer
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
  if (mirrorInterval !== null) {
    window.clearInterval(mirrorInterval);
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

async function getDisplayMedia() {
  const sources = await desktopCapturer.getSources({
    types: ["screen", "window"],
    thumbnailSize: { width: 1920, height: 1080 },
  });
  if (!sources.length) throw new Error("No screen sources");
  const src = sources[0];
  return {
    id: src.id,
    name: src.name,
    thumbnail: src.thumbnail.toDataURL(),
  };
}

async function createScreenStream(sourceId: string) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      // @ts-ignore
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: sourceId,
        minWidth: 1280,
        maxWidth: 1920,
        minHeight: 720,
        maxHeight: 1080,
      },
    },
  });
  return stream;
}

// =====================================================
// 🧩 DEBUG TESTS
// =====================================================
function testPreload() {
  console.log("[preload] Test function called!");
  return "Preload test successful";
}

// =====================================================
// 🌍 EXPOSE TO RENDERER
// =====================================================
contextBridge.exposeInMainWorld("screenAPI", {
  isElectron: true,
  getScreenSources,
  getDisplayMedia,
  createScreenStream,
  testPreload,
});

contextBridge.exposeInMainWorld("controlAPI", {
  socketConnected: () => socket.connected,
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
console.log("[preload] screenAPI & controlAPI exposed successfully");
