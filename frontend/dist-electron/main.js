import { app as c, BrowserWindow as p, ipcMain as h, screen as P, desktopCapturer as O, Menu as T, globalShortcut as y, session as I } from "electron";
import { fileURLToPath as C } from "node:url";
import r from "node:path";
import E from "node:fs";
let m = [];
const b = r.dirname(C(import.meta.url));
process.env.APP_ROOT = r.join(b, "..");
const v = process.env.VITE_DEV_SERVER_URL, k = r.join(process.env.APP_ROOT, "dist-electron"), S = r.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = v ? r.join(process.env.APP_ROOT, "public") : S;
function D() {
  const n = [
    r.join(b, "preload.cjs"),
    r.join(b, "preload.js"),
    r.join(b, "preload.mjs"),
    r.join(k, "preload.cjs"),
    r.join(k, "preload.js"),
    r.join(k, "preload.mjs")
  ], o = n.find((e) => E.existsSync(e));
  return o || (console.error("[main] Preload NOT FOUND. Tried:"), n.forEach((e) => console.error("  -", e)), n[0]);
}
let s = null, a = null;
function _() {
  const n = D();
  console.log(
    "[main] Using preload:",
    n,
    "exists?",
    E.existsSync(n)
  ), a = new p({
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
  }), a.loadFile(r.join(process.env.VITE_PUBLIC, "splash.html")).catch(console.error), a.once("ready-to-show", () => a == null ? void 0 : a.show()), s = new p({
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
  }), s.webContents.on("preload-error", (o, e, l) => {
    console.error("[main] PRELOAD ERROR at", e, l);
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
  }), I.defaultSession.setPermissionRequestHandler((o, e, l) => {
    if (console.log(`[main] Permission requested: ${e}`), e === "media")
      return console.log(`[main] Granting permission: ${e}`), l(!0);
    console.log(`[main] Granting permission: ${e}`), l(!0);
  }), I.defaultSession.setPermissionCheckHandler(
    (o, e, l, f) => (console.log(`[main] Permission check: ${e}`), !0)
  ), v ? s.loadURL(v) : s.loadFile(r.join(S, "index.html")), s.webContents.once("did-finish-load", () => {
    setTimeout(() => {
      a && !a.isDestroyed() && a.close(), a = null, s != null && s.isDestroyed() || (s.show(), s.focus());
    }, 400);
  }), s.webContents.on("did-fail-load", (o, e, l, f, d) => {
    console.error("[main] did-fail-load:", d), a && !a.isDestroyed() && a.close(), a = null, s == null || s.show();
  });
}
c.on("window-all-closed", () => {
  process.platform !== "darwin" && c.quit();
});
c.on("activate", () => {
  p.getAllWindows().length === 0 && _();
});
c.commandLine.appendSwitch("--enable-usermedia-screen-capture");
c.commandLine.appendSwitch("--disable-features", "VizDisplayCompositor");
c.commandLine.appendSwitch("--enable-features", "VaapiVideoDecoder");
c.commandLine.appendSwitch("--autoplay-policy", "no-user-gesture-required");
h.handle("capture-screen", async () => {
  const n = P.getPrimaryDisplay(), { width: o, height: e } = n.size, d = Math.min(1920 / o, 1080 / e, 1), u = Math.floor(o * d), i = Math.floor(e * d), w = await O.getSources({
    types: ["screen"],
    thumbnailSize: { width: u, height: i }
  });
  if (!w.length) return null;
  const R = w[0].thumbnail, x = u >= 1920 ? 70 : u >= 1280 ? 75 : 80;
  return R.toJPEG(x).toString("base64");
});
h.handle("get-screen-sources", async () => {
  try {
    return (await O.getSources({
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
h.on("show-lock-overlay", () => {
  if (m.length > 0) return;
  const n = P.getAllDisplays();
  console.log(`🖥️ Creating lock overlay on ${n.length} screen(s)`), m = n.map((o, e) => {
    const { width: l, height: f, x: d, y: u } = o.bounds, i = new p({
      x: d,
      y: u,
      width: l,
      height: f,
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
    }), w = `
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
    return i.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(w)}`), i.setAlwaysOnTop(!0, "screen-saver"), i.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 }), console.log(`✅ Lock overlay created on display ${e + 1}`), i;
  });
});
h.on("hide-lock-overlay", () => {
  m.length !== 0 && (console.log("🔓 Removing lock overlays..."), m.forEach((n) => {
    n.isDestroyed() || n.close();
  }), m = []);
});
c.commandLine.appendSwitch("lang", "id-ID");
process.env.TZ = "Asia/Jakarta";
c.whenReady().then(_);
let g = [], t = null;
h.on("show-annotation-overlay", () => {
  if (g.length > 0) return;
  g = P.getAllDisplays().map((o, e) => {
    const { x: l, y: f, width: d, height: u } = o.bounds, i = new p({
      x: l,
      y: f,
      width: d,
      height: u,
      frame: !1,
      fullscreen: !0,
      transparent: !0,
      alwaysOnTop: !0,
      focusable: !1,
      skipTaskbar: !0,
      hasShadow: !1,
      webPreferences: { nodeIntegration: !0, contextIsolation: !1 }
    });
    return i.loadFile(
      r.join(process.env.VITE_PUBLIC, "annotation-overlay.html")
    ), i.setAlwaysOnTop(!0, "screen-saver"), i.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 }), i.setIgnoreMouseEvents(!1), console.log(`🖊️ Overlay aktif di layar ${e + 1}`), i;
  }), t = new p({
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
h.on("annotation-action", (n, o) => {
  g.forEach((e) => {
    e.isDestroyed() || (e.webContents.send("annotation-action", o), o.type === "toggle" && (o.value ? (e.setIgnoreMouseEvents(!1), console.log("🖊️ Overlay aktif untuk menggambar")) : (e.setIgnoreMouseEvents(!0, { forward: !0 }), console.log("🖱️ Overlay tembus, bisa klik aplikasi di belakang"))));
  }), o.type === "exit" && (g.forEach((e) => !e.isDestroyed() && e.close()), g = [], t && !t.isDestroyed() && t.close(), t = null);
});
c.whenReady().then(() => {
  _();
  const n = [
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Developer Tools",
          accelerator: "CommandOrControl+Shift+I",
          click: () => {
            const e = p.getFocusedWindow();
            e && e.webContents.toggleDevTools();
          }
        }
      ]
    }
  ];
  T.setApplicationMenu(T.buildFromTemplate(n));
  const o = [
    "CommandOrControl+R",
    // Refresh
    "F5",
    // Refresh key
    "CommandOrControl+Shift+R"
    // Hard reload
  ];
  o.forEach((e) => {
    y.register(e, () => {
      console.log(`🚫 Blocked shortcut: ${e}`);
    }) || console.warn(`⚠️ Failed to block ${e}`);
  }), c.on("browser-window-focus", () => {
    o.forEach((e) => {
      y.isRegistered(e) || y.register(
        e,
        () => console.log(`🚫 Blocked shortcut: ${e}`)
      );
    });
  });
});
c.on("will-quit", () => {
  y.unregisterAll();
});
export {
  k as MAIN_DIST,
  S as RENDERER_DIST,
  v as VITE_DEV_SERVER_URL
};
