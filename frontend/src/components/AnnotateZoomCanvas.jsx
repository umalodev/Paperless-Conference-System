import React, { useRef, useState, useEffect } from "react";

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

  // Resize canvas mengikuti container
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

    // simpan state awal kosong
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

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = tool === "highlighter" ? 0.3 : 1;

    if (tool === "pen" || tool === "highlighter") {
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
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

    // reset alpha
    ctx.globalAlpha = 1;

    // simpan history setelah selesai menggambar
    saveHistory();
    setRedoStack([]);
  };

  const undo = () => {
    if (history.length <= 1) return; // jangan hapus state awal
    const newHist = [...history];
    const last = newHist.pop();
    setRedoStack([...redoStack, last]);
    setHistory(newHist);

    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const prevImg = new Image();
    prevImg.onload = () => ctx.drawImage(prevImg, 0, 0, canvas.width, canvas.height);
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
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          background: "rgba(0,0,0,0.6)",
          borderRadius: 8,
          padding: 6,
          display: "flex",
          gap: 6,
          color: "#fff",
        }}
      >
        <select value={tool} onChange={(e) => setTool(e.target.value)}>
          <option value="pen">Pen</option>
          <option value="highlighter">Highlighter</option>
          <option value="rect">Rectangle</option>
          <option value="circle">Circle</option>
          <option value="arrow">Arrow</option>
        </select>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <input
          type="range"
          min={1}
          max={12}
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
        />
        <button onClick={undo}>↶</button>
        <button onClick={redo}>↷</button>
        <button onClick={clearAll}>🧹</button>
        <button onClick={onClose}>✖</button>
      </div>
    </div>
  );
}
