// src/features/whiteboard/hooks/useCanvasDrawing.js
import { useEffect, useRef, useCallback } from "react";

export default function useCanvasDrawing({ tool, color, size, strokes, setStrokes, queueSave }) {
  const canvasRef = useRef(null);
  const baseCanvasRef = useRef(null);
  const wrapRef = useRef(null);
  const cssSizeRef = useRef({ w: 0, h: 0 });
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef(null);

  // ===== Utility =====
  const drawStroke = useCallback((ctx, s) => {
    if (!s || !s.points?.length) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = s.size || 2;
    if (s.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = s.color || color;
    }
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) {
      const p = s.points[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }, [color]);

  // ===== Base & Visible Render =====
  const renderBaseFromStrokes = useCallback(() => {
    const base = baseCanvasRef.current;
    if (!base) return;
    const bctx = base.getContext("2d");
    const { w, h } = cssSizeRef.current;
    bctx.globalCompositeOperation = "source-over";
    bctx.clearRect(0, 0, w, h);
    bctx.fillStyle = "#fff";
    bctx.fillRect(0, 0, w, h);
    for (const s of strokes) drawStroke(bctx, s);
  }, [strokes, drawStroke]);

  const paintBasePlusCurrent = useCallback(() => {
    const canvas = canvasRef.current;
    const base = baseCanvasRef.current;
    if (!canvas || !base) return;
    const vctx = canvas.getContext("2d");
    const { w, h } = cssSizeRef.current;
    vctx.clearRect(0, 0, w, h);
    vctx.drawImage(base, 0, 0, w, h);
    if (currentStrokeRef.current) drawStroke(vctx, currentStrokeRef.current);
  }, [drawStroke]);

  // ===== Drawing Handlers =====
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    return { x, y };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const p = getPos(e);
    drawingRef.current = true;
    currentStrokeRef.current = { tool, color, size, points: [p] };
    paintBasePlusCurrent();
  };

  const moveDraw = (e) => {
    if (!drawingRef.current) return;
    const p = getPos(e);
    const s = currentStrokeRef.current;
    if (!s) return;
    s.points.push(p);
    paintBasePlusCurrent();
  };

  const endDraw = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const s = currentStrokeRef.current;
    if (!s || s.points.length < 2) {
      currentStrokeRef.current = null;
      paintBasePlusCurrent();
      return;
    }
    setStrokes((prev) => [...prev, s]);
    currentStrokeRef.current = null;
    queueSave();
  };

  // ===== Resize Handling =====
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    const cssW = Math.floor(rect.width);
    const cssH = Math.floor(rect.height - 8);
    cssSizeRef.current = { w: cssW, h: cssH };

    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    const vctx = canvas.getContext("2d");
    vctx.scale(dpr, dpr);

    if (!baseCanvasRef.current) baseCanvasRef.current = document.createElement("canvas");
    const base = baseCanvasRef.current;
    base.width = Math.floor(cssW * dpr);
    base.height = Math.floor(cssH * dpr);
    const bctx = base.getContext("2d");
    bctx.scale(dpr, dpr);

    renderBaseFromStrokes();
    paintBasePlusCurrent();
  }, [renderBaseFromStrokes, paintBasePlusCurrent]);

  useEffect(() => {
    const ro = new ResizeObserver(() => resizeCanvas());
    if (wrapRef.current) ro.observe(wrapRef.current);
    resizeCanvas();
    return () => ro.disconnect();
  }, [resizeCanvas]);

  useEffect(() => {
    renderBaseFromStrokes();
    paintBasePlusCurrent();
  }, [strokes, renderBaseFromStrokes, paintBasePlusCurrent]);

  return { canvasRef, wrapRef, startDraw, moveDraw, endDraw };
}
