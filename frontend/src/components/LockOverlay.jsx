import React, { useEffect, useState } from "react";

/**
 * LockOverlay — menampilkan layar gelap saat host mengunci peserta.
 * Terintegrasi dengan preload → main.ts → ipcMain → renderer.
 */
export default function LockOverlay({ children }) {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    // ✅ Pastikan preload sudah expose ipcRenderer
    const ipc = window.electron?.ipcRenderer || window.ipc;
    if (!ipc) return;

    const show = () => setLocked(true);
    const hide = () => setLocked(false);

    ipc.on("lock-overlay:show", show);
    ipc.on("lock-overlay:hide", hide);

return () => {
  ipc.off("lock-overlay:show", show);
  ipc.off("lock-overlay:hide", hide);
};
  }, []);

  return (
    <>
      {children}
      {locked && (
        <div className="lock-overlay">
          <div className="lock-content">
            <div className="lock-icon">🔒</div>
            <h2 className="lock-title">Screen Locked by Host</h2>
            <p className="lock-subtitle">Please wait until unlocked...</p>
          </div>
        </div>
      )}
    </>
  );
}
