"use strict";
var _a;
const electron = require("electron");
try {
  console.log("[preload] loaded");
  async function getScreenSources() {
    const sources = await electron.desktopCapturer.getSources({
      types: ["screen", "window"]
    });
    return sources.map((s) => ({ id: s.id, name: s.name }));
  }
  electron.contextBridge.exposeInMainWorld(
    "screenAPI",
    Object.freeze({
      isElectron: true,
      getScreenSources
    })
  );
  electron.contextBridge.exposeInMainWorld(
    "ipc",
    Object.freeze({
      on: (...args) => electron.ipcRenderer.on(...args),
      off: (...args) => electron.ipcRenderer.off(...args),
      send: (...args) => electron.ipcRenderer.send(...args),
      invoke: (...args) => electron.ipcRenderer.invoke(...args)
    })
  );
  globalThis.__PRELOAD_OK__ = true;
  console.log("[preload] APIs exposed: window.screenAPI, window.ipc");
} catch (err) {
  try {
    (_a = require("electron").ipcRenderer) == null ? void 0 : _a.send("preload-crashed", String(err));
  } catch {
  }
  console.error("[preload] FAILED:", err);
}
