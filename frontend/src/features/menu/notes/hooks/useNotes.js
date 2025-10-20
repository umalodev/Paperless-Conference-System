import { useEffect, useState, useCallback } from "react";
import { API_URL } from "../../../../config";
import meetingService from "../../../../services/meetingService";

export function useNotes(meetingId) {
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [errNotes, setErrNotes] = useState("");

  const loadNotes = useCallback(async () => {
    if (!meetingId) {
      setNotes([]);
      return;
    }
    setLoadingNotes(true);
    setErrNotes("");
    try {
      const res = await fetch(
        `${API_URL}/api/notes?meetingId=${encodeURIComponent(meetingId)}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...meetingService.getAuthHeaders(),
          },
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setNotes(Array.isArray(json?.data) ? json.data : []);
    } catch (e) {
      setErrNotes(String(e.message || e));
    } finally {
      setLoadingNotes(false);
    }
  }, [meetingId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  return { notes, setNotes, loadingNotes, errNotes, loadNotes };
}
