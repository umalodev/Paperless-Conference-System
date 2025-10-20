// src/features/agenda/hooks/useAgendas.js
import { useState, useCallback } from "react";
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";

/**
 * Hook untuk handle semua operasi agenda aktif:
 * - Load agenda aktif dari meeting sekarang
 * - Tambah, edit, hapus
 */
export default function useAgendas(meetingId, { notify, confirm }) {
  const [agendas, setAgendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ========== FETCH AGENDA ==========
  const loadAgendas = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = meetingId ? `?meetingId=${encodeURIComponent(meetingId)}` : "";
      const res = await fetch(`${API_URL}/api/agendas${qs}`, {
        headers: meetingService.getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const items = Array.isArray(json?.data)
        ? json.data.map((it) => ({
            id: it.meetingAgendaId || it.meeting_agenda_id || it.id,
            title: it.judul,
            start: it.startTime || it.start_time,
            end: it.endTime || it.end_time,
            desc: it.deskripsi || "",
          }))
        : [];
      setAgendas(items);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  // ========== DELETE ==========
  const deleteAgenda = useCallback(
    async (id) => {
      if (!id) return;
      const ok = await confirm({
        title: "Delete Agenda?",
        message:
          "This agenda will be deleted from the meeting. This action cannot be undone.",
        destructive: true,
        okText: "Delete",
        cancelText: "Cancel",
        onConfirm: async () => {
          try {
            const res = await fetch(
              `${API_URL}/api/agendas/${encodeURIComponent(id)}`,
              { method: "DELETE", headers: meetingService.getAuthHeaders() }
            );
            if (!res.ok) {
              const t = await res.json().catch(() => ({}));
              throw new Error(t?.message || `HTTP ${res.status}`);
            }
            await loadAgendas();
            await notify({
              variant: "success",
              title: "Agenda Deleted",
              message: "Agenda has been successfully deleted.",
              autoCloseMs: 2000,
            });
          } catch (e) {
            await notify({
              variant: "error",
              title: "Failed to delete",
              message: e.message || "Unknown error",
              autoCloseMs: 3000,
            });
          }
        },
      });
      if (!ok) return;
    },
    [confirm, notify, loadAgendas]
  );

  return { agendas, loading, error, loadAgendas, deleteAgenda, setAgendas };
}
