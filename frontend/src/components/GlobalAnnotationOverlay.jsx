import React, { useEffect, useRef } from "react";

export default function GlobalAnnotationOverlay() {
  const canvasRef = useRef(null);

  useEffect(() => {
    console.log("[Overlay] Mounted — annotation fully disabled");
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // 🚫 Coba lepaskan semua event 'message' yang mungkin tersisa
    if (window.ws?.off) {
      window.ws.off("message");
    }
    if (window.ws?.removeAllListeners) {
      window.ws.removeAllListeners("message");
    }
    // 🚫 Nonaktifkan fungsi onmessage langsung juga
    if (window.ws) {
      window.ws.onmessage = null;
    }

    return () => {
      console.log("[Overlay] Unmounted");
      window.removeEventListener("resize", resize);
      if (window.ws?.off) window.ws.off("message");
      if (window.ws?.removeAllListeners) window.ws.removeAllListeners("message");
      if (window.ws) window.ws.onmessage = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
}
