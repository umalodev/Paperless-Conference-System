// src/features/whiteboard/hooks/useWhiteboard.js
import { useState, useRef, useEffect, useCallback } from "react";
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";

const DEFAULT_COLOR = "#0d0d0d";
const DEFAULT_SIZE = 3;

export default function useWhiteboard(meetingId) {
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [strokes, setStrokes] = useState([]);
  const redoRef = useRef([]);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);

  // ===== Load / Save =====
  const loadBoard = useCallback(async () => {
    if (!meetingId) return;
    try {
      const res = await fetch(
        `${API_URL}/api/whiteboard?meetingId=${encodeURIComponent(meetingId)}`,
        { headers: meetingService.getAuthHeaders() }
      );
      if (!res.ok) return;
      const json = await res.json().catch(() => ({}));
      const data = json?.data?.data;
      if (data?.strokes) setStrokes(Array.isArray(data.strokes) ? data.strokes : []);
    } catch (e) {
      console.error("Failed to load whiteboard:", e);
    }
  }, [meetingId]);

  const saveBoard = useCallback(
    async (forceEmpty = false) => {
      if (!meetingId) return;
      setSaving(true);
      try {
        const payload = { meetingId, data: { strokes: forceEmpty ? [] : strokes } };
        await fetch(`${API_URL}/api/whiteboard`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...meetingService.getAuthHeaders(),
          },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        console.error("Failed to save whiteboard:", e);
      } finally {
        setSaving(false);
      }
    },
    [meetingId, strokes]
  );

  const queueSave = useCallback(
    (forceEmpty = false) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveBoard(forceEmpty), 800);
    },
    [saveBoard]
  );

  // ===== Undo / Redo / Clear =====
  const onUndo = useCallback(() => {
    if (!strokes.length) return;
    const last = strokes[strokes.length - 1];
    redoRef.current.push(last);
    setStrokes((prev) => prev.slice(0, -1));
    queueSave();
  }, [strokes, queueSave]);

  const onRedo = useCallback(() => {
    const item = redoRef.current.pop();
    if (!item) return;
    setStrokes((prev) => [...prev, item]);
    queueSave();
  }, [queueSave]);

  const onClear = useCallback(() => {
    if (!strokes.length) return;
    redoRef.current = [];
    setStrokes([]);
    queueSave(true);
  }, [strokes, queueSave]);

  // ===== Export PNG =====
  const onExportPNG = useCallback((canvasRef) => {
    const canvas = canvasRef?.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `whiteboard-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, []);

  return {
    tool,
    setTool,
    color,
    setColor,
    size,
    setSize,
    strokes,
    setStrokes,
    saving,
    onUndo,
    onRedo,
    onClear,
    onExportPNG,
    loadBoard,
    saveBoard,
    queueSave,
  };
}
