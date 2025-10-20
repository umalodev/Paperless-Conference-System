// src/features/whiteboard/services/whiteboardService.js
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";

const whiteboardService = {
  /**
   * Load whiteboard data by meetingId
   */
  async loadBoard(meetingId) {
    if (!meetingId) return null;
    try {
      const res = await fetch(
        `${API_URL}/api/whiteboard?meetingId=${encodeURIComponent(meetingId)}`,
        { headers: meetingService.getAuthHeaders() }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json?.data?.data || {};
    } catch (e) {
      console.error("❌ whiteboardService.loadBoard error:", e);
      return null;
    }
  },

  /**
   * Save current strokes to backend
   */
  async saveBoard(meetingId, strokes = []) {
    if (!meetingId) return false;
    try {
      const payload = { meetingId, data: { strokes } };
      const res = await fetch(`${API_URL}/api/whiteboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch (e) {
      console.error("❌ whiteboardService.saveBoard error:", e);
      return false;
    }
  },

  /**
   * Export whiteboard as PNG from canvas element
   */
  exportAsPNG(canvasRef) {
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
  },
};

export default whiteboardService;
