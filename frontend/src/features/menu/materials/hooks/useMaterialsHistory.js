import { useState, useCallback, useEffect } from "react";
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";

const absolutize = (u) => {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  const base = String(API_URL || "").replace(/\/+$/, "");
  const p = `/${String(u).replace(/^\/+/, "")}`;
  return `${base}${p}`;
};

export default function useMaterialsHistory({ meetingId }) {
  const [historyGroups, setHistoryGroups] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errHistory, setErrHistory] = useState("");

  const reloadHistory = useCallback(
    async (query = "") => {
      setLoadingHistory(true);
      setErrHistory("");
      try {
        // ✅ gunakan endpoint materials
        const url = new URL(`${API_URL}/api/materials/history`);
        if (meetingId) url.searchParams.set("excludeMeetingId", meetingId);
        url.searchParams.set("limit", "30");
        url.searchParams.set("withMaterialsOnly", "0");
        if (query.trim()) url.searchParams.set("q", query.trim());

        const res = await fetch(url.toString(), {
          headers: meetingService.getAuthHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        const arr = Array.isArray(json?.data) ? json.data : [];

        // ✅ mapping data sesuai struktur material
        const groups = arr.map((g) => ({
          meetingId: g.meetingId,
          title: g.title,
          startTime: g.startTime,
          endTime: g.endTime,
          status: g.status,
          materials: (g.materials || []).map((m) => ({
            id: m.id,
            url: absolutize(m.url),
            name: m.name,
            uploaderName: m.uploaderName,
            createdAt: m.created_at || m.createdAt,
          })),
        }));

        // Urutkan descending
        groups.sort((a, b) => {
          const da = a.startTime ? new Date(a.startTime).getTime() : 0;
          const db = b.startTime ? new Date(b.startTime).getTime() : 0;
          return db - da;
        });

        setHistoryGroups(groups);
      } catch (e) {
        setErrHistory(String(e.message || e));
      } finally {
        setLoadingHistory(false);
      }
    },
    [meetingId]
  );

  useEffect(() => {
    reloadHistory();
  }, [reloadHistory]);

  return {
    historyGroups,
    loadingHistory,
    errHistory,
    reloadHistory,
  };
}
