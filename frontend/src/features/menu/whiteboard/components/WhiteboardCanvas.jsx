// src/features/whiteboard/components/WhiteboardCanvas.jsx
import React, { useRef, useEffect } from "react";

export default function WhiteboardCanvas({
  wrapRef,
  canvasRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    const c = canvasRef.current;
    if (!c) return;

    c.addEventListener("pointerdown", onPointerDown);
    c.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    c.addEventListener("touchstart", onPointerDown, { passive: false });
    c.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerUp, { passive: false });

    initialized.current = true;

    return () => {
      c.removeEventListener("pointerdown", onPointerDown);
      c.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      c.removeEventListener("touchstart", onPointerDown);
      c.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("touchend", onPointerUp);
    };
  }, [onPointerDown, onPointerMove, onPointerUp, canvasRef]);

  return (
    <div className="wb-canvas-wrap" ref={wrapRef}>
      <canvas ref={canvasRef} className="wb-canvas" />
    </div>
  );
}
