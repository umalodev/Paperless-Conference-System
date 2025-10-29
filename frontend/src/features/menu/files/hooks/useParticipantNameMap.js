// src/features/menu/files/hooks/useParticipantNameMap.js
import { useState, useEffect, useCallback } from "react";
import { getParticipantsList } from "../../../menu/participant/services/participantApi";

export default function useParticipantNameMap(meetingId) {
  const [nameMap, setNameMap] = useState({}); // { "123": "Budi", "456": "Host 1", ... }
  const [loadingNames, setLoadingNames] = useState(false);

  const buildDisplayName = useCallback(
    (rawParticipant) => {
      const { participantId, userId, id, displayName, name } =
        rawParticipant || {};

      const pid =
        String(participantId ?? userId ?? id ?? "").trim() || undefined;

      const localName = meetingId
        ? localStorage.getItem(`meeting:${meetingId}:displayName`)
        : null;

      // prioritas sama kayak useParticipants
      const finalName = displayName || localName || name || "Participant";

      return { pid, finalName };
    },
    [meetingId]
  );

  const load = useCallback(async () => {
    if (!meetingId) return;
    try {
      setLoadingNames(true);
      const json = await getParticipantsList(meetingId);

      if (json.success && Array.isArray(json.data)) {
        const dict = {};

        for (const p of json.data) {
          const { pid, finalName } = buildDisplayName(p);
          if (pid) {
            dict[pid] = finalName;
          }
        }

        setNameMap(dict);
      }
    } catch (err) {
      console.warn("useParticipantNameMap failed:", err);
    } finally {
      setLoadingNames(false);
    }
  }, [meetingId, buildDisplayName]);

  useEffect(() => {
    load();
  }, [load]);

  return { nameMap, loadingNames };
}
