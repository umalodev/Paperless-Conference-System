// src/features/menu/participants/hooks/useParticipantSocket.js
import { useEffect } from "react";
import {
  connectParticipantSocket,
  registerParticipantSocketHandlers,
  unregisterParticipantSocketHandlers,
} from "../services";

/**
 * Hook socket participant (join, leave, update)
 */
export function useParticipantSocket(meetingId, userId, setParticipants) {
  useEffect(() => {
    if (!meetingId) return;
    connectParticipantSocket(meetingId, userId);

    const handleJoin = (data) => {
      console.log("[Socket] participant_joined:", data);
      const id = String(data.participantId ?? data.userId);
      const name = data.displayName || "Participant";

      setParticipants((prev) => {
        const idx = prev.findIndex((p) => String(p.id) === id);
        if (idx !== -1) {
          const updated = [...prev];
          if (updated[idx].displayName !== name)
            updated[idx] = { ...updated[idx], displayName: name };
          return updated;
        }
        return [
          ...prev,
          {
            id,
            displayName: name,
            mic: data.mic ?? false,
            cam: data.cam ?? false,
            role: data.role || "participant",
          },
        ];
      });
    };

    const handleLeave = (data) => {
      const id = String(data.participantId ?? data.userId);
      console.log("[Socket] participant_left:", data);
      setParticipants((prev) => prev.filter((p) => String(p.id) !== id));
    };

    const handleUpdate = (data) => {
      console.log("[Socket] participant_updated:", data);
      setParticipants((prev) =>
        prev.map((p) =>
          String(p.id) === String(data.participantId ?? data.userId)
            ? { ...p, ...data.updates }
            : p
        )
      );
    };

    const handleInitialList = (data) => {
      console.log("[Socket] participants_list:", data);
      if (Array.isArray(data)) {
        setParticipants((prev) => {
          const ids = new Set(prev.map((p) => String(p.id)));
          return [
            ...prev,
            ...data
              .filter((p) => !ids.has(String(p.participantId)))
              .map((p) => ({
                id: String(p.participantId ?? p.userId ?? p.id),
                displayName: p.displayName || "Participant",
                mic: false,
                cam: false,
                role: "participant",
              })),
          ];
        });
      }
    };

    registerParticipantSocketHandlers({
      onJoin: handleJoin,
      onLeave: handleLeave,
      onUpdate: handleUpdate,
      onInitialList: handleInitialList,
    });

    return () => {
      unregisterParticipantSocketHandlers({
        onJoin: handleJoin,
        onLeave: handleLeave,
        onUpdate: handleUpdate,
        onInitialList: handleInitialList,
      });
    };
  }, [meetingId, userId, setParticipants]);
}
