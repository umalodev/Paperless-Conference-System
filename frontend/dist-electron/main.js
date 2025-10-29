import { app, BrowserWindow, ipcMain, screen, desktopCapturer, Menu, globalShortcut, session } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
let lockWindows = [];
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
function findPreload() {
  const candidates = [
    path.join(__dirname, "preload.cjs"),
    path.join(__dirname, "preload.js"),
    path.join(__dirname, "preload.mjs"),
    path.join(MAIN_DIST, "preload.cjs"),
    path.join(MAIN_DIST, "preload.js"),
    path.join(MAIN_DIST, "preload.mjs")
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    console.error("[main] Preload NOT FOUND. Tried:");
    candidates.forEach((p) => console.error("  -", p));
    return candidates[0];
  }
  return found;
}
let win = null;
let splashWin = null;
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
    transparent: false,
    backgroundColor: "#00000000",
    // transparansi manual
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false
  });
  splashWin.loadFile(path.join(process.env.VITE_PUBLIC, "splash.html")).catch(console.error);
  splashWin.once("ready-to-show", () => splashWin == null ? void 0 : splashWin.show());
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    backgroundColor: "#111111",
    icon: path.join(process.env.VITE_PUBLIC, "img/splash_logo.png"),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // penting agar modul Electron tersedia di preload
      webSecurity: false,
      // dev only
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      // Enable screen capture APIs
      // Additional permissions for screen sharing
      additionalArguments: ["--enable-features=VaapiVideoDecoder"]
    }
  });
  win.webContents.on("preload-error", (_e, p, err) => {
    console.error("[main] PRELOAD ERROR at", p, err);
  });
  win.webContents.on("dom-ready", () => {
    console.log("[main] DOM ready, checking preload status");
    win.webContents.executeJavaScript(
      `
        console.log("[renderer] has screenAPI?", !!window.screenAPI);
        console.log("[renderer] screenAPI contents:", window.screenAPI);
        console.log("[renderer] has __PRELOAD_OK__?", !!window.__PRELOAD_OK__);
        console.log("[renderer] screenAPI.isElectron:", window.screenAPI?.isElectron);
        console.log("[renderer] screenAPI.getScreenSources:", typeof window.screenAPI?.getScreenSources);
        `
    ).catch((err) => console.error("[main] executeJavaScript error:", err));
  });
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    console.log(`[main] Permission requested: ${permission}`);
    if (permission === "media") {
      console.log(`[main] Granting permission: ${permission}`);
      return cb(true);
    }
    console.log(`[main] Granting permission: ${permission}`);
    cb(true);
  });
  session.defaultSession.setPermissionCheckHandler(
    (_wc, permission, _origin, _details) => {
      console.log(`[main] Permission check: ${permission}`);
      if (permission === "media") {
        return true;
      }
      return true;
    }
  );
  if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(RENDERER_DIST, "index.html"));
  win.webContents.once("did-finish-load", () => {
    setTimeout(() => {
      if (splashWin && !splashWin.isDestroyed()) splashWin.close();
      splashWin = null;
      if (!(win == null ? void 0 : win.isDestroyed())) {
        win.show();
        win.focus();
      }
    }, 400);
  });
  win.webContents.on("did-fail-load", (_e, _c, _d, _l, errDesc) => {
    console.error("[main] did-fail-load:", errDesc);
    if (splashWin && !splashWin.isDestroyed()) splashWin.close();
    splashWin = null;
    win == null ? void 0 : win.show();
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.commandLine.appendSwitch("--enable-usermedia-screen-capture");
app.commandLine.appendSwitch("--disable-features", "VizDisplayCompositor");
app.commandLine.appendSwitch("--enable-features", "VaapiVideoDecoder");
app.commandLine.appendSwitch("--autoplay-policy", "no-user-gesture-required");
ipcMain.handle("capture-screen", async () => {
  const primary = screen.getPrimaryDisplay();
  const { width, height } = primary.size;
  const maxWidth = 1920;
  const maxHeight = 1080;
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  const captureWidth = Math.floor(width * scale);
  const captureHeight = Math.floor(height * scale);
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: captureWidth, height: captureHeight }
  });
  if (!sources.length) return null;
  const image = sources[0].thumbnail;
  const adaptiveQuality = captureWidth >= 1920 ? 70 : captureWidth >= 1280 ? 75 : 80;
  const base64 = image.toJPEG(adaptiveQuality).toString("base64");
  return base64;
});
ipcMain.handle("get-screen-sources", async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 300, height: 200 }
    });
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail.toDataURL()
    }));
  } catch (err) {
    console.error("[main] get-screen-sources failed:", err);
    return [];
  }
});
ipcMain.on("show-lock-overlay", () => {
  if (lockWindows.length > 0) return;
  const displays = screen.getAllDisplays();
  console.log(`🖥️ Creating lock overlay on ${displays.length} screen(s)`);
  lockWindows = displays.map((d, idx) => {
    const { width, height, x, y } = d.bounds;
    const win2 = new BrowserWindow({
      x,
      y,
      width,
      height,
      frame: false,
      fullscreen: true,
      kiosk: true,
      transparent: false,
      alwaysOnTop: true,
      movable: false,
      resizable: false,
      skipTaskbar: true,
      backgroundColor: "#000000",
      webPreferences: { contextIsolation: true }
    });
    const lockHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Device Locked</title>
          <style>
            html, body {
              margin: 0;
              height: 100%;
              width: 100%;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              background: radial-gradient(circle at center, #101010 0%, #000000 100%);
              font-family: "Poppins", "Segoe UI", sans-serif;
              color: #ffffff;
              user-select: none;
              overflow: hidden;
              cursor: none;
            }

            .lock-icon {
              font-size: 90px;
              color: #ff4444;
              text-shadow: 0 0 20px rgba(255, 68, 68, 0.5);
              animation: pulse 2s infinite;
            }

            h1 {
              font-size: 2.2rem;
              margin: 15px 0 10px;
              letter-spacing: 0.5px;
            }

            p {
              font-size: 1rem;
              color: #bbbbbb;
              opacity: 0.8;
            }

            .footer {
              position: absolute;
              bottom: 40px;
              font-size: 0.9rem;
              color: #666;
              opacity: 0.6;
            }

            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.1); opacity: 0.8; }
            }
          </style>
        </head>
        <body>
          <div class="lock-icon">🔒</div>
          <h1>Device Locked</h1>
          <p>Please wait until your administrator unlocks this computer.</p>
          <div class="footer">© ${(/* @__PURE__ */ new Date()).getFullYear()} UP-CONNECT</div>
        </body>
      </html>
    `;
    win2.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(lockHtml)}`);
    win2.setAlwaysOnTop(true, "screen-saver");
    win2.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    console.log(`✅ Lock overlay created on display ${idx + 1}`);
    return win2;
  });
});
ipcMain.on("hide-lock-overlay", () => {
  if (lockWindows.length === 0) return;
  console.log("🔓 Removing lock overlays...");
  lockWindows.forEach((w) => {
    if (!w.isDestroyed()) w.close();
  });
  lockWindows = [];
});
app.commandLine.appendSwitch("lang", "id-ID");
process.env.TZ = "Asia/Jakarta";
app.whenReady().then(createWindow);
let annotationWindows = [];
let toolbarWindow = null;
ipcMain.on("show-annotation-overlay", () => {
  if (annotationWindows.length > 0) return;
  const displays = screen.getAllDisplays();
  annotationWindows = displays.map((display, idx) => {
    const { x, y, width, height } = display.bounds;
    const overlay = new BrowserWindow({
      x,
      y,
      width,
      height,
      frame: false,
      fullscreen: true,
      transparent: true,
      alwaysOnTop: true,
      focusable: false,
      skipTaskbar: true,
      hasShadow: false,
      webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    overlay.loadFile(
      path.join(process.env.VITE_PUBLIC, "annotation-overlay.html")
    );
    overlay.setAlwaysOnTop(true, "screen-saver");
    overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    overlay.setIgnoreMouseEvents(false);
    console.log(`🖊️ Overlay aktif di layar ${idx + 1}`);
    return overlay;
  });
  toolbarWindow = new BrowserWindow({
    width: 480,
    // sedikit lebih lebar agar tombol tidak terpotong
    height: 80,
    // menyesuaikan padding & border radius di HTML
    x: 100,
    y: 100,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    // agar blur & shadow HTML terlihat natural
    skipTaskbar: true,
    resizable: false,
    movable: true,
    focusable: true,
    // penting supaya bisa diklik tombolnya
    hasShadow: true,
    roundedCorners: true,
    // opsional (Electron 28+)
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true
      // aktifkan devtools saat debug
    }
  });
  toolbarWindow.setAlwaysOnTop(true, "screen-saver");
  toolbarWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  toolbarWindow.loadFile(
    path.join(process.env.VITE_PUBLIC, "annotation-toolbar.html")
  );
  toolbarWindow.once("ready-to-show", () => {
    toolbarWindow == null ? void 0 : toolbarWindow.show();
    toolbarWindow == null ? void 0 : toolbarWindow.focus();
    console.log("✅ Toolbar ditampilkan di atas semua layar");
  });
  toolbarWindow.on("closed", () => {
    toolbarWindow = null;
  });
});
ipcMain.on("annotation-action", (_event, action) => {
  annotationWindows.forEach((overlay) => {
    if (!overlay.isDestroyed()) {
      overlay.webContents.send("annotation-action", action);
      if (action.type === "toggle") {
        if (action.value) {
          overlay.setIgnoreMouseEvents(false);
          console.log("🖊️ Overlay aktif untuk menggambar");
        } else {
          overlay.setIgnoreMouseEvents(true, { forward: true });
          console.log("🖱️ Overlay tembus, bisa klik aplikasi di belakang");
        }
      }
    }
  });
  if (action.type === "exit") {
    annotationWindows.forEach((w) => !w.isDestroyed() && w.close());
    annotationWindows = [];
    if (toolbarWindow && !toolbarWindow.isDestroyed()) toolbarWindow.close();
    toolbarWindow = null;
  }
});
app.whenReady().then(() => {
  createWindow();
  const template = [
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Developer Tools",
          accelerator: "CommandOrControl+Shift+I",
          click: () => {
            const focused = BrowserWindow.getFocusedWindow();
            if (focused) focused.webContents.toggleDevTools();
          }
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  const shortcutsToBlock = [
    "CommandOrControl+R",
    // Refresh
    "F5",
    // Refresh key
    "CommandOrControl+Shift+R"
    // Hard reload
  ];
  shortcutsToBlock.forEach((sc) => {
    const success = globalShortcut.register(sc, () => {
      console.log(`🚫 Blocked shortcut: ${sc}`);
    });
    if (!success) console.warn(`⚠️ Failed to block ${sc}`);
  });
  app.on("browser-window-focus", () => {
    shortcutsToBlock.forEach((sc) => {
      if (!globalShortcut.isRegistered(sc)) {
        globalShortcut.register(
          sc,
          () => console.log(`🚫 Blocked shortcut: ${sc}`)
        );
      }
    });
  });
});
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
app.whenReady().then(() => {
  createWindow();
  Menu.setApplicationMenu(null);
  const shortcutsToBlock = [
    "CommandOrControl+R",
    // Refresh
    "F5",
    // Refresh key
    "CommandOrControl+Shift+R",
    // Hard reload
    "CommandOrControl+Alt+I",
    // DevTools
    "CommandOrControl+Shift+I"
    // DevTools (variasi)
  ];
  shortcutsToBlock.forEach((sc) => {
    const success = globalShortcut.register(sc, () => {
      console.log(`🚫 Blocked shortcut: ${sc}`);
    });
    if (!success) console.warn(`⚠️ Failed to block ${sc}`);
  });
  app.on("browser-window-focus", () => {
    shortcutsToBlock.forEach((sc) => {
      if (!globalShortcut.isRegistered(sc)) {
        globalShortcut.register(sc, () => console.log(`🚫 Blocked shortcut: ${sc}`));
      }
    });
  });
});
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
