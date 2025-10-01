import React, { useRef, useState, useEffect } from "react";
import Icon from "./Icon";

export default function AnnotateZoomCanvas({ attachTo, onClose }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#ff0000");
  const [lineWidth, setLineWidth] = useState(3);

  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [startPoint, setStartPoint] = useState(null);

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

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const snapshot = canvas.toDataURL();
    setHistory((prev) => [...prev, snapshot]);
  };

  const startDraw = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    setIsDrawing(true);
    setStartPoint({ x: offsetX, y: offsetY });

    const ctx = ctxRef.current;
    if (tool === "pen" || tool === "highlighter") {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = e.nativeEvent;
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // restore terakhir dari history agar coretan lama tidak hilang
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
      const sp = startPoint;
      const dx = offsetX - sp.x;
      const dy = offsetY - sp.y;

      if (tool === "rect") {
        ctx.strokeRect(sp.x, sp.y, dx, dy);
      }
      if (tool === "circle") {
        ctx.beginPath();
        ctx.ellipse(
          sp.x + dx / 2,
          sp.y + dy / 2,
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
    const ctx = ctxRef.current;

    if (tool === "rect" || tool === "circle" || tool === "arrow") {
      const sp = startPoint;
      const dx = offsetX - sp.x;
      const dy = offsetY - sp.y;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = 1;

      if (tool === "rect") ctx.strokeRect(sp.x, sp.y, dx, dy);
      if (tool === "circle") {
        ctx.beginPath();
        ctx.ellipse(
          sp.x + dx / 2,
          sp.y + dy / 2,
          Math.abs(dx / 2),
          Math.abs(dy / 2),
          0,
          0,
          2 * Math.PI
        );
        ctx.stroke();
      }
      if (tool === "arrow") {
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    saveHistory();
    setRedoStack([]);
  };

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

  const clearAll = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveHistory();
    setRedoStack([]);
  };

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
        style={{ width: "100%", height: "100%", cursor: "crosshair" }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
      />

      {/* Toolbar bawah */}
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
        <ToolButton
          slug="annotate"
          active={tool === "pen"}
          onClick={() => setTool("pen")}
          title="Pen"
        />

        <ToolButton
          slug="square"
          active={tool === "rect"}
          onClick={() => setTool("rect")}
          title="Rectangle"
        />

        <ToolButton
          slug="circle"
          active={tool === "circle"}
          onClick={() => setTool("circle")}
          title="Circle"
        />
        
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
        <ToolButton slug="trash" onClick={clearAll} title="Clear All" />
        <ToolButton slug="close" onClick={onClose} title="Close" />
      </div>
    </div>
  );
}
