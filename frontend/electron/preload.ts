import { contextBridge, desktopCapturer, ipcRenderer } from "electron";

try {
  console.log("[preload] loaded");

  // Helper aman: kembalikan data plain (tanpa NativeImage)
  async function getScreenSources() {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
    });
    return sources.map((s) => ({ id: s.id, name: s.name }));
  }

  // Expose API minimal & stabil
  contextBridge.exposeInMainWorld(
    "screenAPI",
    Object.freeze({
      isElectron: true,
      getScreenSources,
    })
  );

  // (opsional) wrapper ipcRenderer
  contextBridge.exposeInMainWorld(
    "ipc",
    Object.freeze({
      on: (...args: Parameters<typeof ipcRenderer.on>) =>
        ipcRenderer.on(...args),
      off: (...args: Parameters<typeof ipcRenderer.off>) =>
        ipcRenderer.off(...args),
      send: (...args: Parameters<typeof ipcRenderer.send>) =>
        ipcRenderer.send(...args),
      invoke: (...args: Parameters<typeof ipcRenderer.invoke>) =>
        ipcRenderer.invoke(...args),
    })
  );

  // Marker untuk debugging di renderer
  (globalThis as any).__PRELOAD_OK__ = true;

  console.log("[preload] APIs exposed: window.screenAPI, window.ipc");
} catch (err) {
  // Jika ada error runtime di preload, log agar terlihat di console main
  try {
    // @ts-ignore
    require("electron").ipcRenderer?.send("preload-crashed", String(err));
  } catch {}
  console.error("[preload] FAILED:", err);
  // Jangan throw; biar Electron tidak mematikan proses renderer
}
