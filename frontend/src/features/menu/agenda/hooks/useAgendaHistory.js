// src/features/agenda/hooks/useAgendaHistory.js
import { useState, useCallback } from "react";
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";

/**
 * Hook untuk handle riwayat agenda (meeting sebelumnya)
 */
export default function useAgendaHistory(meetingId) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = new URL(`${API_URL}/api/agendas/history`);
      if (meetingId) url.searchParams.set("excludeMeetingId", meetingId);
      url.searchParams.set("limit", "30");
      url.searchParams.set("withAgendasOnly", "0");

      const res = await fetch(url.toString(), {
        headers: meetingService.getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const groups = Array.isArray(json?.data)
        ? json.data.map((g) => ({
            meetingId: g.meetingId,
            title: g.title,
            startTime: g.startTime,
            endTime: g.endTime,
            status: g.status,
            agendas: (g.agendas || []).map((a) => ({
              id: a.id,
              judul: a.judul,
              deskripsi: a.deskripsi || "",
              startTime: a.startTime || a.start_time,
              endTime: a.endTime || a.end_time,
              seq: a.seq,
            })),
          }))
        : [];

      groups.sort((a, b) => {
        const da = a.startTime ? new Date(a.startTime).getTime() : 0;
        const db = b.startTime ? new Date(b.startTime).getTime() : 0;
        return db - da;
      });

      setGroups(groups);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  return { groups, loading, error, loadHistory };
}
