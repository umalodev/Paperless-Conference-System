import React, { useEffect, useRef } from "react";

export default function GlobalAnnotationOverlay({ role }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    if (!window.ws) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "anno:clear") {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          return;
        }

        if (data.type === "anno:commit" && data.shape) {
          // 🔑 Kalau viewer → jangan render coretan dari dirinya sendiri
          if (role === "viewer" && data.from === window.currentUserId) return;

          const shape = data.shape;
          const scaleX = canvas.width / (shape.canvasWidth || canvas.width);
          const scaleY = canvas.height / (shape.canvasHeight || canvas.height);

          ctx.strokeStyle = shape.color || "#ff0000";
          ctx.lineWidth = shape.lineWidth || 2;
          ctx.globalAlpha = 1;

          if (shape.kind === "pen" && shape.points) {
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x * scaleX, shape.points[0].y * scaleY);
            shape.points.forEach((p) =>
              ctx.lineTo(p.x * scaleX, p.y * scaleY)
            );
            ctx.stroke();
          }

          if (shape.kind === "rect") {
            ctx.strokeRect(
              shape.x * scaleX,
              shape.y * scaleY,
              shape.w * scaleX,
              shape.h * scaleY
            );
          }

          if (shape.kind === "circle") {
            ctx.beginPath();
            ctx.ellipse(
              shape.cx * scaleX,
              shape.cy * scaleY,
              shape.rx * scaleX,
              shape.ry * scaleY,
              0,
              0,
              2 * Math.PI
            );
            ctx.stroke();
          }
        }
      } catch (err) {
        console.error("Parse annotation error:", err);
      }
    };

    window.ws.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("resize", resize);
      window.ws?.removeEventListener("message", handleMessage);
    };
  }, [role]);

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
