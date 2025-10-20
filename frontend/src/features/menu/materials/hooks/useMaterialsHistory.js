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

export default function useFilesHistory({ meetingId }) {
  const [historyGroups, setHistoryGroups] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errHistory, setErrHistory] = useState("");

  const reloadHistory = useCallback(
    async (query = "") => {
      setLoadingHistory(true);
      setErrHistory("");
      try {
        const url = new URL(`${API_URL}/api/files/history`);
        if (meetingId) url.searchParams.set("excludeMeetingId", meetingId);
        url.searchParams.set("limit", "30");
        url.searchParams.set("withFilesOnly", "0");
        if (query.trim()) url.searchParams.set("q", query.trim());

        const res = await fetch(url.toString(), {
          headers: meetingService.getAuthHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        const arr = Array.isArray(json?.data) ? json.data : [];

        const groups = arr.map((g) => ({
          meetingId: g.meetingId,
          title: g.title,
          startTime: g.startTime,
          endTime: g.endTime,
          status: g.status,
          files: (g.files || []).map((f) => ({
            id: f.id,
            url: f.url,
            urlAbs: absolutize(f.url),
            name: f.name,
            uploaderName: f.uploaderName,
            createdAt: f.created_at || f.createdAt,
          })),
        }));

        // Urutkan berdasarkan waktu mulai (descending)
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

  // ✅ Auto load saat mount seperti di useMaterialsHistory
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
