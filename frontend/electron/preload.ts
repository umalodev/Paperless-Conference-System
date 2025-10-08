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
      // Windows built-in lock
      exec("rundll32.exe user32.dll,LockWorkStation");
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
// 🧱  LOCK / UNLOCK BY ADMIN (overlay mode)
// =====================================================
let overlay: HTMLDivElement | null = null;

socket.on("lock-screen", () => {
  console.log("🔒 Received lock-screen event from admin");

  if (overlay) return; // already locked

  overlay = document.createElement("div");
  overlay.id = "admin-lock-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.96)",
    color: "white",
    fontSize: "2rem",
    fontWeight: "600",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "999999",
    userSelect: "none",
  });
  overlay.innerHTML = `
    <div>🔒 PC Locked by Administrator</div>
    <div style="font-size:1rem;margin-top:12px;opacity:0.8">
      Please wait until it’s unlocked.
    </div>
  `;
  document.body.appendChild(overlay);

  // Disable input
  document.body.style.pointerEvents = "none";
  window.addEventListener("keydown", preventInput, true);
  window.addEventListener("mousedown", preventInput, true);
  window.addEventListener("mousemove", preventInput, true);
  window.addEventListener("contextmenu", preventInput, true);
});

socket.on("unlock-screen", () => {
  console.log("🔓 Received unlock-screen event from admin");

  // Re-enable input
  document.body.style.pointerEvents = "auto";
  window.removeEventListener("keydown", preventInput, true);
  window.removeEventListener("mousedown", preventInput, true);
  window.removeEventListener("mousemove", preventInput, true);
  window.removeEventListener("contextmenu", preventInput, true);

  if (overlay) {
    overlay.remove();
    overlay = null;
  }
});

function preventInput(e: Event) {
  e.stopPropagation();
  e.preventDefault();
}

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
