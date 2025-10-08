import { app, BrowserWindow, session } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { ipcMain, desktopCapturer, screen } from "electron";

let lockWindows: BrowserWindow[] = [];


const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

// Cari preload dengan prioritas .cjs (CommonJS)
function findPreload(): string {
  const candidates = [
    path.join(__dirname, "preload.cjs"),
    path.join(__dirname, "preload.js"),
    path.join(__dirname, "preload.mjs"),
    path.join(MAIN_DIST, "preload.cjs"),
    path.join(MAIN_DIST, "preload.js"),
    path.join(MAIN_DIST, "preload.mjs"),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    console.error("[main] Preload NOT FOUND. Tried:");
    candidates.forEach((p) => console.error("  -", p));
    return candidates[0]; // biar errornya kelihatan jelas
  }
  return found;
}

let win: BrowserWindow | null = null;
let splashWin: BrowserWindow | null = null;

function createWindow() {
  const preloadPath = findPreload();
  console.log(
    "[main] Using preload:",
    preloadPath,
    "exists?",
    fs.existsSync(preloadPath)
  );

  splashWin = new BrowserWindow({
    width: 460,
    height: 300,
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
  });

  splashWin
    .loadFile(path.join(process.env.VITE_PUBLIC!, "splash.html"))
    .catch(console.error);
  splashWin.once("ready-to-show", () => splashWin?.show());

  win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    backgroundColor: "#111111",
    icon: path.join(process.env.VITE_PUBLIC!, "electron-vite.svg"),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // penting agar modul Electron tersedia di preload
      webSecurity: false, // dev only
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      // Enable screen capture APIs
      // Additional permissions for screen sharing
      additionalArguments: ['--enable-features=VaapiVideoDecoder'],
    },
  });

  win.webContents.on("preload-error", (_e, p, err) => {
    console.error("[main] PRELOAD ERROR at", p, err);
  });

  win.webContents.on("dom-ready", () => {
    console.log("[main] DOM ready, checking preload status");
    win!.webContents
      .executeJavaScript(
        `
        console.log("[renderer] has screenAPI?", !!window.screenAPI);
        console.log("[renderer] screenAPI contents:", window.screenAPI);
        console.log("[renderer] has __PRELOAD_OK__?", !!window.__PRELOAD_OK__);
        console.log("[renderer] screenAPI.isElectron:", window.screenAPI?.isElectron);
        console.log("[renderer] screenAPI.getScreenSources:", typeof window.screenAPI?.getScreenSources);
        `
      )
      .catch((err) => console.error("[main] executeJavaScript error:", err));
  });
  // Enhanced permission handler for screen capture
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    console.log(`[main] Permission requested: ${permission}`);
    if (permission === "media") {
      console.log(`[main] Granting permission: ${permission}`);
      return cb(true);
    }
    console.log(`[main] Granting permission: ${permission}`);
    cb(true);
  });

  // Set additional permissions for screen capture
  session.defaultSession.setPermissionCheckHandler((_wc, permission, _origin, _details) => {
    console.log(`[main] Permission check: ${permission}`);
    if (permission === "media") {
      return true;
    }
    return true;
  });

  if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(RENDERER_DIST, "index.html"));

  win.webContents.once("did-finish-load", () => {
    setTimeout(() => {
      if (splashWin && !splashWin.isDestroyed()) splashWin.close();
      splashWin = null;
      if (!win?.isDestroyed()) {
        win!.show();
        win!.focus();
      }
    }, 400); // sedikit delay biar transisinya halus
  });

  win.webContents.on("did-fail-load", (_e, _c, _d, _l, errDesc) => {
    console.error("[main] did-fail-load:", errDesc);
    if (splashWin && !splashWin.isDestroyed()) splashWin.close();
    splashWin = null;
    win?.show();
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
// Add command line arguments for better screen capture support
app.commandLine.appendSwitch('--enable-usermedia-screen-capture');
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('--enable-features', 'VaapiVideoDecoder');
app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');

ipcMain.handle("capture-screen", async () => {
  const primary = screen.getPrimaryDisplay();
  const { width, height } = primary.size;

  // 🔹 Ambil screenshot sesuai resolusi asli (bukan 640x360)
  // Batasi maksimum agar tidak terlalu berat
  const maxWidth = 1920;
  const maxHeight = 1080;
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);

  const captureWidth = Math.floor(width * scale);
  const captureHeight = Math.floor(height * scale);

  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: captureWidth, height: captureHeight },
  });

  if (!sources.length) return null;

  // 🔹 JPEG quality ditingkatkan (90)
  const image = sources[0].thumbnail;
  const img = image.toJPEG(90).toString("base64");
  return img;
});

// =========================================================
// 🧊 Lock Overlay Handler
// =========================================================
ipcMain.on("show-lock-overlay", () => {
  // Jangan buat ulang jika sudah ada
  if (lockWindows.length > 0) return;

  const displays = screen.getAllDisplays();
  console.log(`🖥️ Creating lock overlay on ${displays.length} screen(s)`);

  lockWindows = displays.map((d, idx) => {
    const { width, height, x, y } = d.bounds;
    const win = new BrowserWindow({
      x,
      y,
      width,
      height,
      frame: false,
      fullscreen: true,
      kiosk: true, // mode terkunci — tidak bisa di-Alt+Tab
      transparent: false,
      alwaysOnTop: true,
      movable: false,
      resizable: false,
      skipTaskbar: true,
      backgroundColor: "#000000",
      webPreferences: {
        contextIsolation: true,
      },
    });

    // Tampilkan halaman overlay sederhana
    win.loadURL(
      `data:text/html;charset=utf-8,` +
      encodeURIComponent(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Locked</title>
            <style>
              body {
                margin: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: #000;
                color: #fff;
                font-family: sans-serif;
              }
              h1 { font-size: 32px; margin: 12px 0; }
              p { opacity: 0.7; }
              .icon { font-size: 80px; }
              @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
              }
              .blink { animation: blink 2s infinite; }
            </style>
          </head>
          <body>
            <h1>Device Locked by Administrator</h1>
            <p>Please wait until admin unlocks your screen.</p>
          </body>
        </html>
      `)
    );
    win.setAlwaysOnTop(true, "screen-saver");
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.fullScreen = true;

    console.log(`🖥️ Lock overlay created on display ${idx + 1}`);
    return win;
  });
});

// === Fungsi: hilangkan overlay lock ===
ipcMain.on("hide-lock-overlay", () => {
  if (lockWindows.length === 0) return;

  console.log("🔓 Removing lock overlays...");
  lockWindows.forEach((w) => {
    if (!w.isDestroyed()) w.close();
  });
  lockWindows = [];
});



app.whenReady().then(createWindow);
