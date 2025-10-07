import { app, BrowserWindow, session } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
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
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
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
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
