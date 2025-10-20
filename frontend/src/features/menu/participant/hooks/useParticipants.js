// src/features/menu/participants/hooks/useParticipants.js
import { useState, useCallback } from "react";
import { getParticipantsList, updateParticipantStatus } from "../services";

export function useParticipants(meetingId) {
  const [participants, setParticipants] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [errList, setErrList] = useState("");

  const loadInitial = useCallback(async () => {
    if (!meetingId) return;
    try {
      setLoadingList(true);
      const json = await getParticipantsList(meetingId);
      if (json.success && Array.isArray(json.data)) {
        const formatted = json.data.map((p) => ({
          id: String(p.participantId ?? p.userId ?? p.id),
          displayName:
            p.displayName ||
            localStorage.getItem(`meeting:${meetingId}:displayName`) ||
            p.name ||
            "Participant",
          mic: !!p.isAudioEnabled,
          cam: !!p.isVideoEnabled,
          role: p.role || "participant",
        }));
        setParticipants(formatted);
      }
    } catch (e) {
      console.error("❌ Failed to load participants:", e);
      setErrList(e.message);
    } finally {
      setLoadingList(false);
    }
  }, [meetingId]);

  const reload = useCallback(async () => {
    await loadInitial();
  }, [loadInitial]);

  const updateStatus = useCallback(async (participantId, updates) => {
    try {
      const json = await updateParticipantStatus(participantId, updates);
      if (json.success) {
        setParticipants((prev) =>
          prev.map((p) => (p.id === participantId ? { ...p, ...updates } : p))
        );
      } else {
        console.error("Failed to update participant status:", json.message);
      }
    } catch (error) {
      console.error("Error updating participant status:", error);
    }
  }, []);

  return { participants, setParticipants, loadInitial, reload, updateStatus, loadingList, errList };
}
