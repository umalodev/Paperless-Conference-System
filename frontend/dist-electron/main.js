import { app as a, BrowserWindow as h, ipcMain as m, screen as I, desktopCapturer as _, Menu as O, globalShortcut as u, session as T } from "electron";
import { fileURLToPath as A } from "node:url";
import r from "node:path";
import C from "node:fs";
let g = [];
const y = r.dirname(A(import.meta.url));
process.env.APP_ROOT = r.join(y, "..");
const P = process.env.VITE_DEV_SERVER_URL, v = r.join(process.env.APP_ROOT, "dist-electron"), E = r.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = P ? r.join(process.env.APP_ROOT, "public") : E;
function x() {
  const n = [
    r.join(y, "preload.cjs"),
    r.join(y, "preload.js"),
    r.join(y, "preload.mjs"),
    r.join(v, "preload.cjs"),
    r.join(v, "preload.js"),
    r.join(v, "preload.mjs")
  ], o = n.find((e) => C.existsSync(e));
  return o || (console.error("[main] Preload NOT FOUND. Tried:"), n.forEach((e) => console.error("  -", e)), n[0]);
}
let s = null, l = null;
function k() {
  const n = x();
  console.log(
    "[main] Using preload:",
    n,
    "exists?",
    C.existsSync(n)
  ), l = new h({
    width: 460,
    height: 300,
    frame: !1,
    resizable: !1,
    transparent: !1,
    backgroundColor: "#00000000",
    // transparansi manual
    alwaysOnTop: !0,
    skipTaskbar: !0,
    show: !1
  }), l.loadFile(r.join(process.env.VITE_PUBLIC, "splash.html")).catch(console.error), l.once("ready-to-show", () => l == null ? void 0 : l.show()), s = new h({
    width: 1280,
    height: 800,
    show: !1,
    backgroundColor: "#111111",
    icon: r.join(process.env.VITE_PUBLIC, "img/splash_logo.png"),
    webPreferences: {
      preload: n,
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1,
      // penting agar modul Electron tersedia di preload
      webSecurity: !1,
      // dev only
      allowRunningInsecureContent: !0,
      experimentalFeatures: !0,
      // Enable screen capture APIs
      // Additional permissions for screen sharing
      additionalArguments: ["--enable-features=VaapiVideoDecoder"]
    }
  }), s.webContents.on("preload-error", (o, e, i) => {
    console.error("[main] PRELOAD ERROR at", e, i);
  }), s.webContents.on("dom-ready", () => {
    console.log("[main] DOM ready, checking preload status"), s.webContents.executeJavaScript(
      `
        console.log("[renderer] has screenAPI?", !!window.screenAPI);
        console.log("[renderer] screenAPI contents:", window.screenAPI);
        console.log("[renderer] has __PRELOAD_OK__?", !!window.__PRELOAD_OK__);
        console.log("[renderer] screenAPI.isElectron:", window.screenAPI?.isElectron);
        console.log("[renderer] screenAPI.getScreenSources:", typeof window.screenAPI?.getScreenSources);
        `
    ).catch((o) => console.error("[main] executeJavaScript error:", o));
  }), T.defaultSession.setPermissionRequestHandler((o, e, i) => {
    if (console.log(`[main] Permission requested: ${e}`), e === "media")
      return console.log(`[main] Granting permission: ${e}`), i(!0);
    console.log(`[main] Granting permission: ${e}`), i(!0);
  }), T.defaultSession.setPermissionCheckHandler(
    (o, e, i, p) => (console.log(`[main] Permission check: ${e}`), !0)
  ), P ? s.loadURL(P) : s.loadFile(r.join(E, "index.html")), s.webContents.once("did-finish-load", () => {
    setTimeout(() => {
      l && !l.isDestroyed() && l.close(), l = null, s != null && s.isDestroyed() || (s.show(), s.focus());
    }, 400);
  }), s.webContents.on("did-fail-load", (o, e, i, p, d) => {
    console.error("[main] did-fail-load:", d), l && !l.isDestroyed() && l.close(), l = null, s == null || s.show();
  });
}
a.on("window-all-closed", () => {
  process.platform !== "darwin" && a.quit();
});
a.on("activate", () => {
  h.getAllWindows().length === 0 && k();
});
a.commandLine.appendSwitch("--enable-usermedia-screen-capture");
a.commandLine.appendSwitch("--disable-features", "VizDisplayCompositor");
a.commandLine.appendSwitch("--enable-features", "VaapiVideoDecoder");
a.commandLine.appendSwitch("--autoplay-policy", "no-user-gesture-required");
m.handle("capture-screen", async () => {
  const n = I.getPrimaryDisplay(), { width: o, height: e } = n.size, d = Math.min(1920 / o, 1080 / e, 1), f = Math.floor(o * d), c = Math.floor(e * d), b = await _.getSources({
    types: ["screen"],
    thumbnailSize: { width: f, height: c }
  });
  if (!b.length) return null;
  const R = b[0].thumbnail, S = f >= 1920 ? 70 : f >= 1280 ? 75 : 80;
  return R.toJPEG(S).toString("base64");
});
m.handle("get-screen-sources", async () => {
  try {
    return (await _.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 300, height: 200 }
    })).map((o) => ({
      id: o.id,
      name: o.name,
      thumbnail: o.thumbnail.toDataURL()
    }));
  } catch (n) {
    return console.error("[main] get-screen-sources failed:", n), [];
  }
});
m.on("show-lock-overlay", () => {
  if (g.length > 0) return;
  const n = I.getAllDisplays();
  console.log(`🖥️ Creating lock overlay on ${n.length} screen(s)`), g = n.map((o, e) => {
    const { width: i, height: p, x: d, y: f } = o.bounds, c = new h({
      x: d,
      y: f,
      width: i,
      height: p,
      frame: !1,
      fullscreen: !0,
      kiosk: !0,
      transparent: !1,
      alwaysOnTop: !0,
      movable: !1,
      resizable: !1,
      skipTaskbar: !0,
      backgroundColor: "#000000",
      webPreferences: { contextIsolation: !0 }
    }), b = `
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
    return c.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(b)}`), c.setAlwaysOnTop(!0, "screen-saver"), c.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 }), console.log(`✅ Lock overlay created on display ${e + 1}`), c;
  });
});
m.on("hide-lock-overlay", () => {
  g.length !== 0 && (console.log("🔓 Removing lock overlays..."), g.forEach((n) => {
    n.isDestroyed() || n.close();
  }), g = []);
});
a.commandLine.appendSwitch("lang", "id-ID");
process.env.TZ = "Asia/Jakarta";
a.whenReady().then(k);
let w = [], t = null;
m.on("show-annotation-overlay", () => {
  if (w.length > 0) return;
  w = I.getAllDisplays().map((o, e) => {
    const { x: i, y: p, width: d, height: f } = o.bounds, c = new h({
      x: i,
      y: p,
      width: d,
      height: f,
      frame: !1,
      fullscreen: !0,
      transparent: !0,
      alwaysOnTop: !0,
      focusable: !1,
      skipTaskbar: !0,
      hasShadow: !1,
      webPreferences: { nodeIntegration: !0, contextIsolation: !1 }
    });
    return c.loadFile(
      r.join(process.env.VITE_PUBLIC, "annotation-overlay.html")
    ), c.setAlwaysOnTop(!0, "screen-saver"), c.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 }), c.setIgnoreMouseEvents(!1), console.log(`🖊️ Overlay aktif di layar ${e + 1}`), c;
  }), t = new h({
    width: 480,
    // sedikit lebih lebar agar tombol tidak terpotong
    height: 80,
    // menyesuaikan padding & border radius di HTML
    x: 100,
    y: 100,
    frame: !1,
    alwaysOnTop: !0,
    transparent: !0,
    // agar blur & shadow HTML terlihat natural
    skipTaskbar: !0,
    resizable: !1,
    movable: !0,
    focusable: !0,
    // penting supaya bisa diklik tombolnya
    hasShadow: !0,
    roundedCorners: !0,
    // opsional (Electron 28+)
    webPreferences: {
      nodeIntegration: !0,
      contextIsolation: !1,
      devTools: !0
      // aktifkan devtools saat debug
    }
  }), t.setAlwaysOnTop(!0, "screen-saver"), t.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 }), t.loadFile(
    r.join(process.env.VITE_PUBLIC, "annotation-toolbar.html")
  ), t.once("ready-to-show", () => {
    t == null || t.show(), t == null || t.focus(), console.log("✅ Toolbar ditampilkan di atas semua layar");
  }), t.on("closed", () => {
    t = null;
  });
});
m.on("annotation-action", (n, o) => {
  w.forEach((e) => {
    e.isDestroyed() || (e.webContents.send("annotation-action", o), o.type === "toggle" && (o.value ? (e.setIgnoreMouseEvents(!1), console.log("🖊️ Overlay aktif untuk menggambar")) : (e.setIgnoreMouseEvents(!0, { forward: !0 }), console.log("🖱️ Overlay tembus, bisa klik aplikasi di belakang"))));
  }), o.type === "exit" && (w.forEach((e) => !e.isDestroyed() && e.close()), w = [], t && !t.isDestroyed() && t.close(), t = null);
});
a.whenReady().then(() => {
  k();
  const n = [
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Developer Tools",
          accelerator: "CommandOrControl+Shift+I",
          click: () => {
            const e = h.getFocusedWindow();
            e && e.webContents.toggleDevTools();
          }
        }
      ]
    }
  ];
  O.setApplicationMenu(O.buildFromTemplate(n));
  const o = [
    "CommandOrControl+R",
    // Refresh
    "F5",
    // Refresh key
    "CommandOrControl+Shift+R"
    // Hard reload
  ];
  o.forEach((e) => {
    u.register(e, () => {
      console.log(`🚫 Blocked shortcut: ${e}`);
    }) || console.warn(`⚠️ Failed to block ${e}`);
  }), a.on("browser-window-focus", () => {
    o.forEach((e) => {
      u.isRegistered(e) || u.register(
        e,
        () => console.log(`🚫 Blocked shortcut: ${e}`)
      );
    });
  });
});
a.on("will-quit", () => {
  u.unregisterAll();
});
a.whenReady().then(() => {
  k(), O.setApplicationMenu(null);
  const n = [
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
  n.forEach((o) => {
    u.register(o, () => {
      console.log(`🚫 Blocked shortcut: ${o}`);
    }) || console.warn(`⚠️ Failed to block ${o}`);
  }), a.on("browser-window-focus", () => {
    n.forEach((o) => {
      u.isRegistered(o) || u.register(o, () => console.log(`🚫 Blocked shortcut: ${o}`));
    });
  });
});
a.on("will-quit", () => {
  u.unregisterAll();
});
export {
  v as MAIN_DIST,
  E as RENDERER_DIST,
  P as VITE_DEV_SERVER_URL
};
