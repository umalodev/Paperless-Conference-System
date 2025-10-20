import { useState, useEffect, useCallback } from "react";
import { API_URL } from "../../../../config";
import meetingService from "../../../../services/meetingService";

export default function useServices(user, showSuccess, showError) {
  const [myRequests, setMyRequests] = useState([]);
  const [teamRequests, setTeamRequests] = useState([]);
  const [loadingReq, setLoadingReq] = useState(false);
  const [errReq, setErrReq] = useState("");
  const [busyId, setBusyId] = useState(null);

  const resolveMeetingId = useCallback(() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || cm?.code || null;
    } catch {
      return null;
    }
  }, []);

  const isAssist = String(user?.role || "").toLowerCase() === "assist";

  const loadRequests = useCallback(async () => {
    if (!user) return;
    setLoadingReq(true);
    setErrReq("");
    try {
      const headers = meetingService.getAuthHeaders();
      const meetingId = resolveMeetingId();

      if (isAssist) {
        const res = await fetch(`${API_URL}/api/services/meeting/${meetingId}`, {
          headers,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const rows = Array.isArray(json?.data) ? json.data : [];
        const others = rows.filter(
          (r) => r.requesterUserId !== (user?.id || user?.userId)
        );
        setTeamRequests(others);
        setMyRequests([]);
      } else {
        const me = user?.id || user?.userId;
        if (me) {
          const res = await fetch(
            `${API_URL}/api/services?requesterUserId=${me}&sortBy=created_at&sortDir=DESC`,
            { headers }
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          setMyRequests(Array.isArray(json?.data) ? json.data : []);
        } else {
          setMyRequests([]);
        }
        setTeamRequests([]);
      }
    } catch (e) {
      setErrReq(String(e.message || e));
    } finally {
      setLoadingReq(false);
    }
  }, [user, isAssist, resolveMeetingId]);

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 10000);
    return () => clearInterval(interval);
  }, [loadRequests]);

  return {
    myRequests,
    teamRequests,
    loadingReq,
    errReq,
    busyId,
    setBusyId,
    loadRequests,
    resolveMeetingId,
  };
}
