// src/features/chat/hooks/useParticipants.js
import { useEffect, useMemo, useState, useCallback } from "react";
import { chatApi } from "../services";

/**
 * Hook untuk mengelola daftar participant
 */
export default function useParticipants(user, meetingId) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadParticipants = useCallback(async () => {
    if (!meetingId) return;
    try {
      setLoading(true);
      setLoaded(false);
      const data = await chatApi.getParticipants(meetingId);
      setParticipants(data);
    } catch (e) {
      console.error("❌ Gagal memuat participants:", e);
      setParticipants([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [meetingId]);

  useEffect(() => {
    if (user?.id) loadParticipants();
  }, [user?.id, loadParticipants]);

  /** Mapping userId → displayName */
  const nameByUserId = useMemo(() => {
    const m = new Map();
    participants.forEach((p) => {
      const nm = p.displayName || p.name || p.username || "Participant";
      if (p.userId != null) m.set(String(p.userId), nm);
    });
    return m;
  }, [participants]);

  return {
    participants,
    loading,
    loaded,
    nameByUserId,
    reload: loadParticipants,
  };
}
