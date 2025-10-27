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
    transparent: true,
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
    icon: path.join(process.env.VITE_PUBLIC, "img/logo.png"),
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
ipcMain.on("show-annotation-overlay", () => {
  if (annotationWindows.length > 0) return;
  const displays = screen.getAllDisplays();
  let currentAnnotateState = true;
  annotationWindows = displays.map((display, idx) => {
    const { x, y, width, height } = display.bounds;
    const win2 = new BrowserWindow({
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
      webPreferences: {
        contextIsolation: true,
        sandbox: true
      }
    });
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Annotation Overlay</title>
          <style>
            html, body {
              margin: 0; height: 100%; width: 100%;
              background: transparent; overflow: hidden;
            }
            canvas { width: 100%; height: 100%; cursor: crosshair; }
            .toolbar {
              position: fixed;
              top: 15px;
              right: 15px;
              background: rgba(0, 0, 0, 0.65);
              color: white;
              padding: 8px 12px;
              border-radius: 10px;
              display: flex;
              gap: 8px;
              z-index: 9999;
              font-family: "Segoe UI", sans-serif;
            }
            button {
              background: #2563eb;
              border: none;
              color: white;
              padding: 6px 10px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              transition: background 0.2s;
            }
            button:hover { background: #1e4ed8; }
            button.secondary { background: #4b5563; }
            button.danger { background: #dc2626; }
          </style>
        </head>
        <body>
          <canvas id="canvas"></canvas>
          <div class="toolbar">
            <button id="toggleDrawBtn">Stop Annotate</button>
            <button id="undoBtn">Undo</button>
            <button id="clearBtn">Clear</button>
            <button id="exitBtn" class="danger">Exit</button>
          </div>

          <script>
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            let drawing = false;
            let enabled = true;
            let paths = [];
            let currentPath = [];

            ctx.lineWidth = 3;
            ctx.strokeStyle = 'red';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            function redraw() {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              for (const path of paths) {
                ctx.beginPath();
                for (let i = 0; i < path.length; i++) {
                  const { x, y } = path[i];
                  if (i === 0) ctx.moveTo(x, y);
                  else ctx.lineTo(x, y);
                }
                ctx.stroke();
              }
            }

            canvas.addEventListener('mousedown', e => {
              if (!enabled) return;
              drawing = true;
              currentPath = [{ x: e.clientX, y: e.clientY }];
            });

            canvas.addEventListener('mousemove', e => {
              if (!enabled || !drawing) return;
              currentPath.push({ x: e.clientX, y: e.clientY });
              redraw();
              ctx.beginPath();
              for (let i = 0; i < currentPath.length; i++) {
                const { x, y } = currentPath[i];
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();
            });

            window.addEventListener('mouseup', () => {
              if (drawing && enabled) paths.push(currentPath);
              drawing = false;
              currentPath = [];
            });

            const send = (action, payload) => {
              console.log(JSON.stringify({ action, payload }));
            };


            document.getElementById('toggleDrawBtn').onclick = () => {
              enabled = !enabled;
              document.getElementById('toggleDrawBtn').textContent = enabled ? 'Stop Annotate' : 'Start Annotate';
              send('annotation-toggle', enabled);
            };

            document.getElementById('undoBtn').onclick = () => {
              paths.pop();
              redraw();
            };

            document.getElementById('clearBtn').onclick = () => {
              paths = [];
              redraw();
            };

            document.getElementById('exitBtn').onclick = () => {
              send('annotation-exit');
            };
          <\/script>
        </body>
      </html>
    `;
    win2.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    win2.setAlwaysOnTop(true, "screen-saver");
    win2.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win2.setIgnoreMouseEvents(false);
    win2.webContents.on("ipc-message", (_, channel, data) => {
      console.log("ipc-message:", channel, data);
    });
    win2.webContents.on("console-message", (_, __, message) => {
      try {
        const data = JSON.parse(message);
        if (data.action === "toolbar-hover") {
          if (data.payload) {
            win2.setIgnoreMouseEvents(false);
          } else if (currentAnnotateState === false) {
            win2.setIgnoreMouseEvents(true, { forward: true });
          }
          return;
        }
        if (data.action === "annotation-toggle") {
          currentAnnotateState = data.payload;
          if (data.payload) {
            win2.setIgnoreMouseEvents(false);
            console.log("🖊️ Annotate ON (bisa menggambar lagi)");
          } else {
            win2.setIgnoreMouseEvents(true, { forward: true });
            console.log("🖱️ Annotate OFF (passthrough aktif)");
          }
        }
        if (data.action === "annotation-exit") {
          if (!win2.isDestroyed()) win2.close();
          annotationWindows = annotationWindows.filter((w) => w !== win2);
          console.log("🧹 Annotation overlay closed");
        }
      } catch {
      }
    });
    win2.webContents.on("did-finish-load", () => {
      win2.webContents.executeJavaScript(`
    const toolbar = document.querySelector('.toolbar');
    window.addEventListener('mousemove', (e) => {
      const rect = toolbar.getBoundingClientRect();
      const inToolbar = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      // kirim pesan ke main process: mouse di atas toolbar atau tidak
      console.log(JSON.stringify({ action: 'toolbar-hover', payload: inToolbar }));
    });

    window.addEventListener("message", (e) => {
      const { action, payload } = e.data;
      if (action === "annotation-toggle") {
        console.log(JSON.stringify({ action, payload }));
      }
      if (action === "annotation-exit") {
        console.log(JSON.stringify({ action }));
      }
    });
  `);
    });
    console.log("🖊️ Annotation overlay aktif di layar", idx + 1);
    return win2;
  });
});
ipcMain.on("hide-annotation-overlay", () => {
  if (annotationWindows.length === 0) {
    console.log("ℹ️ No annotation overlay to close.");
    return;
  }
  console.log("🔴 Closing all annotation overlays...");
  annotationWindows.forEach((win2) => {
    try {
      if (!win2.isDestroyed()) {
        win2.close();
      }
    } catch (err) {
      console.warn("⚠️ Failed to close annotation window:", err);
    }
  });
  annotationWindows = [];
});
ipcMain.on("hide-annotation-tools", () => {
  if (annotationWindows.length === 0) {
    console.log("ℹ️ No annotation tools to close.");
    return;
  }
  console.log("🔴 Hiding annotation toolbars (if any)...");
  annotationWindows.forEach((win2) => {
    try {
      if (!win2.isDestroyed()) {
        win2.webContents.executeJavaScript(`
          const toolbar = document.querySelector('.toolbar');
          if (toolbar) toolbar.remove();
        `);
      }
    } catch (err) {
      console.warn("⚠️ Failed to remove toolbar:", err);
    }
  });
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
