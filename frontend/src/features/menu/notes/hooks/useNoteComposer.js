import { useState, useRef, useEffect, useCallback } from "react";
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";

export function useNoteComposer({ meetingId, notify }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [showBodyHint, setShowBodyHint] = useState(false);
  const bodyRef = useRef(null);
  const bodyHintTimerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(bodyHintTimerRef.current);
  }, []);

  const resetComposer = () => {
    setTitle("");
    setBody("");
  };

  const handleAdd = useCallback(
    async (e, setNotes) => {
      e.preventDefault();
      const t = title.trim();
      const b = body.trim();

      if (!b) {
        setShowBodyHint(true);
        bodyRef.current?.focus();
        clearTimeout(bodyHintTimerRef.current);
        bodyHintTimerRef.current = setTimeout(() => setShowBodyHint(false), 1800);
        return;
      }

      if (!meetingId) {
        notify?.({
          variant: "error",
          title: "Error",
          message: "Meeting belum aktif/terpilih.",
          autoCloseMs: 5000,
        });
        return;
      }

      setSaving(true);
      try {
        const payload = { meetingId, title: t, body: b };
        const res = await fetch(`${API_URL}/api/notes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...meetingService.getAuthHeaders(),
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const created = json.data;
        setNotes?.((prev) => [created, ...prev]);
        resetComposer();
        notify?.({
          variant: "success",
          title: "Success",
          message: "Note has been successfully added",
          autoCloseMs: 3000,
        });
      } catch (e) {
        notify?.({
          variant: "error",
          title: "Failed to Add Note",
          message: e.message || String(e),
          autoCloseMs: 5000,
        });
      } finally {
        setSaving(false);
      }
    },
    [title, body, meetingId, notify]
  );

  return {
    title,
    body,
    saving,
    showBodyHint,
    setTitle,
    setBody,
    handleAdd,
    resetComposer,
  };
}
