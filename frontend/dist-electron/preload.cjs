"use strict";
var _a;
const electron = require("electron");
try {
  let testPreload = function() {
    console.log("[preload] Test function called - preload is working!");
    return "Preload test successful";
  };
  console.log("[preload] loaded");
  console.log("[preload] desktopCapturer available:", !!electron.desktopCapturer);
  async function getScreenSources() {
    console.log("[preload] getScreenSources called");
    try {
      const sources = await electron.desktopCapturer.getSources({
        types: ["screen", "window"]
      });
      console.log("[preload] Found sources:", sources.length);
      return sources.map((s) => ({ id: s.id, name: s.name }));
    } catch (error) {
      console.error("[preload] Error getting screen sources:", error);
      throw error;
    }
  }
  async function getDisplayMedia() {
    try {
      const sources = await electron.desktopCapturer.getSources({
        types: ["screen", "window"],
        thumbnailSize: { width: 1920, height: 1080 }
      });
      if (sources.length === 0) {
        throw new Error("No screen sources available");
      }
      const source = sources[0];
      return {
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL()
      };
    } catch (error) {
      console.error("Error getting display media:", error);
      throw error;
    }
  }
  async function createScreenStream(sourceId) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-ignore - Electron specific constraint
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: sourceId,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080
          }
        }
      });
      return stream;
    } catch (error) {
      console.error("Error creating screen stream:", error);
      throw error;
    }
  }
  const screenAPI = Object.freeze({
    isElectron: true,
    getScreenSources,
    getDisplayMedia,
    createScreenStream,
    testPreload
  });
  console.log("[preload] Exposing screenAPI:", screenAPI);
  electron.contextBridge.exposeInMainWorld("screenAPI", screenAPI);
  console.log("[preload] screenAPI exposed successfully");
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
