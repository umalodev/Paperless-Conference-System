// preload.ts
import { contextBridge, desktopCapturer, ipcRenderer } from "electron";
import os from "os";
import { exec } from "child_process";
import screenshot from "screenshot-desktop";
import { io } from "socket.io-client";

// ====== CONFIGURABLE ======
const CONTROL_SERVER = "http://192.168.1.5:4000"; // Ganti sesuai IP server
const MIRROR_FPS = 2; // 2 frame per detik

// ====== SOCKET.IO CLIENT ======
const socket = io(CONTROL_SERVER, { transports: ["websocket"] });

// === Helper: ambil token login dari localStorage ===
function getToken() {
  try {
    // diambil dari localStorage yang diset waktu login.jsx
    return localStorage.getItem("token");
  } catch (err) {
    console.warn("[preload] Gagal ambil token:", err);
    return null;
  }
}

// === Saat connect ke control server ===
socket.on("connect", () => {
  console.log("✅ Connected to Control Server:", socket.id);

  const hostname = os.hostname();
  const user = os.userInfo().username;
  const platform = os.platform();
  const token = getToken();

  const payload: any = { hostname, user, os: platform };
  if (token) payload.token = token;

  // Kirim identitas PC + token user ke control-server
  socket.emit("register", payload);
  console.log("[preload] Registering participant:", payload);
});

// === Handle disconnect ===
socket.on("disconnect", () => {
  console.warn("❌ Disconnected from Control Server");
});

// === Auto re-register saat reconnect ===
socket.io.on("reconnect", () => {
  console.log("🔁 Reconnected to Control Server, re-registering...");
  const hostname = os.hostname();
  const user = os.userInfo().username;
  const platform = os.platform();
  const token = getToken();
  const payload: any = { hostname, user, os: platform };
  if (token) payload.token = token;
  socket.emit("register", payload);
});

// === Command handling ===
socket.on("command", async (cmd: string) => {
  console.log("⚙️ Received command:", cmd);
  switch (cmd) {
    case "lock":
      exec("rundll32.exe user32.dll,LockWorkStation");
      break;
    case "shutdown":
      exec("shutdown /s /t 0");
      break;
    case "reboot":
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

// === Mirror (screen streaming) ===
let mirrorInterval: NodeJS.Timer | null = null;

async function startMirror() {
  if (mirrorInterval) return; // prevent duplicates
  console.log("🪞 Mirror started");

  mirrorInterval = setInterval(async () => {
    try {
      const imgBuffer = await screenshot();
      const img = imgBuffer.toString("base64");
      socket.emit("mirror-frame", img);
    } catch (err) {
      console.error("Mirror error:", err);
    }
  }, 1000 / MIRROR_FPS);
}

function stopMirror() {
  if (mirrorInterval) {
    clearInterval(mirrorInterval as any);
    mirrorInterval = null;
    console.log("🪞 Mirror stopped");
  }
}

// ====== EXISTING SCREEN API ======
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
  const source = sources[0];
  return {
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL(),
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

function testPreload() {
  console.log("[preload] Test function called - preload is working!");
  return "Preload test successful";
}

// ====== EXPOSE APIs TO RENDERER ======
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

// Debug marker
(globalThis as any).__PRELOAD_OK__ = true;
console.log("[preload] ✅ screenAPI & controlAPI exposed");
