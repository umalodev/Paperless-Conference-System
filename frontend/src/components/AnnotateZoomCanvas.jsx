import React, { useRef, useState, useEffect } from "react";
import Icon from "./Icon";

export default function AnnotateZoomCanvas({ attachTo, onClose, mode = "full" }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#ff0000");
  const [lineWidth, setLineWidth] = useState(3);

  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [startPoint, setStartPoint] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);

  // ---- Setup canvas size ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !attachTo?.current) return;
    const rect = attachTo.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
    saveHistory();
  }, [attachTo]);

  // ---- Listen remote annotations ----
useEffect(() => {
  if (!window.ws) return;

  const handleMessage = (event) => {
    try {
      const msg = event?.data ?? event;
      const data = typeof msg === "string" ? JSON.parse(msg) : msg;

      // hanya tangani coretan
      if (!data?.type?.startsWith("anno:")) return;

      if (data.type === "anno:commit" && data.shape) {
        if (mode === "full" && data.from === window.currentUserId) return;
        drawRemoteShape(data.shape);
      }

      if (data.type === "anno:clear") {
        clearAll(true);
      }
    } catch (e) {
      console.error("WS parse error:", e);
    }
  };

  window.ws.on?.("message", handleMessage);
  return () => window.ws?.off?.("message", handleMessage);
}, [mode]);

  // ---- Draw shape from remote ----
  const drawRemoteShape = (shape) => {
  const ctx = ctxRef.current;
  const canvas = canvasRef.current;
  if (!ctx || !canvas) return;

  ctx.strokeStyle = shape.color || "#ff0000";
  ctx.lineWidth = shape.lineWidth || 2;
  ctx.globalAlpha = 1;

  if (shape.kind === "pen" && shape.points) {
    ctx.beginPath();
    ctx.moveTo(shape.points[0].x * canvas.width, shape.points[0].y * canvas.height);
    shape.points.forEach(p => ctx.lineTo(p.x * canvas.width, p.y * canvas.height));
    ctx.stroke();
  }
  if (shape.kind === "rect") {
    ctx.strokeRect(
      shape.x * canvas.width,
      shape.y * canvas.height,
      shape.w * canvas.width,
      shape.h * canvas.height
    );
  }
  if (shape.kind === "circle") {
    ctx.beginPath();
    ctx.ellipse(
      shape.cx * canvas.width,
      shape.cy * canvas.height,
      shape.rx * canvas.width,
      shape.ry * canvas.height,
      0, 0, 2 * Math.PI
    );
    ctx.stroke();
  }
};


  // ---- History & snapshot ----
  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const snapshot = canvas.toDataURL();
    setHistory((prev) => [...prev, snapshot]);
  };

  // ---- Local drawing ----
  const startDraw = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    setIsDrawing(true);
    setStartPoint({ x: offsetX, y: offsetY });
    setCurrentPath([{ x: offsetX, y: offsetY }]);

    const ctx = ctxRef.current;
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = e.nativeEvent;
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;

    setCurrentPath((prev) => [...prev, { x: offsetX, y: offsetY }]);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (history.length > 0) {
      const prevImg = new Image();
      prevImg.onload = () =>
        ctx.drawImage(prevImg, 0, 0, canvas.width, canvas.height);
      prevImg.src = history[history.length - 1];
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = tool === "highlighter" ? 0.3 : 1;

    if (tool === "pen" || tool === "highlighter") {
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
    } else if (tool === "rect" || tool === "circle") {
      const dx = offsetX - startPoint.x;
      const dy = offsetY - startPoint.y;
      if (tool === "rect") ctx.strokeRect(startPoint.x, startPoint.y, dx, dy);
      if (tool === "circle") {
        ctx.beginPath();
        ctx.ellipse(
          startPoint.x + dx / 2,
          startPoint.y + dy / 2,
          Math.abs(dx / 2),
          Math.abs(dy / 2),
          0,
          0,
          2 * Math.PI
        );
        ctx.stroke();
      }
    }
  };

  const endDraw = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const { offsetX, offsetY } = e.nativeEvent;
    const canvas = canvasRef.current;

    let shapeData = null;
    if (tool === "pen") {
      shapeData = {
        kind: "pen",
        points: currentPath,
        color,
        lineWidth,
      };
    }
    if (tool === "rect") {
      shapeData = {
        kind: "rect",
        x: startPoint.x,
        y: startPoint.y,
        w: offsetX - startPoint.x,
        h: offsetY - startPoint.y,
        color,
        lineWidth,
      };
    }
    if (tool === "circle") {
      shapeData = {
        kind: "circle",
        cx: (startPoint.x + offsetX) / 2,
        cy: (startPoint.y + offsetY) / 2,
        rx: Math.abs(offsetX - startPoint.x) / 2,
        ry: Math.abs(offsetY - startPoint.y) / 2,
        color,
        lineWidth,
      };
    }

    if (shapeData) {
      shapeData.canvasWidth = canvas.width;
      shapeData.canvasHeight = canvas.height;

      // Normalisasi ke 0..1
      if (shapeData.points) {
        shapeData.points = shapeData.points.map(p => ({
          x: p.x / canvas.width,
          y: p.y / canvas.height
        }));
      }
      if (shapeData.kind === "rect") {
        shapeData.x = shapeData.x / canvas.width;
        shapeData.y = shapeData.y / canvas.height;
        shapeData.w = shapeData.w / canvas.width;
        shapeData.h = shapeData.h / canvas.height;
      }
      if (shapeData.kind === "circle") {
        shapeData.cx = shapeData.cx / canvas.width;
        shapeData.cy = shapeData.cy / canvas.height;
        shapeData.rx = shapeData.rx / canvas.width;
        shapeData.ry = shapeData.ry / canvas.height;
      }

      window.ws?.send(JSON.stringify({
        type: "anno:commit",
        meetingId: window.currentMeetingId,
        from: window.currentUserId,
        shape: shapeData,
      }));
    }


    saveHistory();
    setRedoStack([]);
  };

  // ---- Tools ----
  const undo = () => {
    if (history.length <= 1) return;
    const newHist = [...history];
    const last = newHist.pop();
    setRedoStack([...redoStack, last]);
    setHistory(newHist);

    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const prevImg = new Image();
    prevImg.onload = () =>
      ctx.drawImage(prevImg, 0, 0, canvas.width, canvas.height);
    prevImg.src = newHist[newHist.length - 1];
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack.pop();
    setHistory([...history, next]);

    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = next;
  };

  const clearAll = (skipBroadcast = false) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveHistory();
    setRedoStack([]);
    if (!skipBroadcast) {
      window.ws?.send(
        JSON.stringify({
          type: "anno:clear",
          meetingId: window.currentMeetingId,
          from: window.currentUserId,
        })
      );
    }
  };

  // ---- Toolbar button ----
  const ToolButton = ({ slug, active, onClick, title }) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? "#2563eb" : "rgba(255,255,255,0.1)",
        border: "none",
        borderRadius: "50%",
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "#fff",
      }}
    >
      <Icon slug={slug} size={20} />
    </button>
  );

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 20 }}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          cursor: mode === "full" ? "crosshair" : "default",
        }}
        onMouseDown={mode === "full" ? startDraw : undefined}
        onMouseMove={mode === "full" ? draw : undefined}
        onMouseUp={mode === "full" ? endDraw : undefined}
      />

      {mode === "full" && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            background: "rgba(30,30,30,0.85)",
            borderRadius: 50,
            padding: "8px 14px",
            display: "flex",
            gap: 10,
            alignItems: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <ToolButton slug="annotate" active={tool === "pen"} onClick={() => setTool("pen")} title="Pen" />
          <ToolButton slug="square" active={tool === "rect"} onClick={() => setTool("rect")} title="Rectangle" />
          <ToolButton slug="circle" active={tool === "circle"} onClick={() => setTool("circle")} title="Circle" />

          <div style={{ position: "relative" }}>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{
                opacity: 0,
                position: "absolute",
                inset: 0,
                cursor: "pointer",
              }}
            />
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                backgroundColor: color,
                border: "2px solid #fff",
                boxShadow: "0 0 4px rgba(0,0,0,0.3)",
                cursor: "pointer",
              }}
            />
          </div>

          <input
            type="range"
            min={1}
            max={12}
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            style={{
              WebkitAppearance: "none",
              width: 100,
              height: 4,
              borderRadius: 4,
              background: `linear-gradient(to right, #4f46e5 ${(lineWidth / 12) * 100}%, #e5e7eb ${(lineWidth / 12) * 100}%)`,
              outline: "none",
              cursor: "pointer",
            }}
          />

          <ToolButton slug="undo" onClick={undo} title="Undo" />
          <ToolButton slug="redo" onClick={redo} title="Redo" />
          <ToolButton slug="trash" onClick={() => clearAll(false)} title="Clear All" />
          <ToolButton slug="close" onClick={onClose} title="Close" />
        </div>
      )}
    </div>
  );
}
