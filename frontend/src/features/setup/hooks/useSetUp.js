import { useCallback, useEffect, useMemo, useState } from "react";

export default function useSetUp({ meetingService, API_URL, navigate, modal }) {
  // ===== bootstrap user/host name
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) setUser(JSON.parse(raw));
    setDisplayName(localStorage.getItem("pconf.displayName") || "");
  }, []);
  const hostName = useMemo(
    () => displayName || user?.username || user?.name || "Host",
    [displayName, user]
  );

  // ===== view & wizard state
  const [viewMode, setViewMode] = useState("scheduled"); // "scheduled" | "history"
  const [showWizard, setShowWizard] = useState(false);
  const [isQuickStartWizard, setIsQuickStartWizard] = useState(false);
  const openQuickStart = () => {
    setIsQuickStartWizard(true);
    setShowWizard(true);
  };
  const openScheduleWizard = () => {
    setIsQuickStartWizard(false);
    setShowWizard(true);
  };
  const closeWizard = () => {
    setShowWizard(false);
    setIsQuickStartWizard(false);
  };

  // ===== scheduled list
  const [scheduled, setScheduled] = useState([]);
  const [loadingScheduled, setLoadingScheduled] = useState(true);
  const [errScheduled, setErrScheduled] = useState("");

  const loadScheduled = useCallback(async () => {
    setLoadingScheduled(true);
    setErrScheduled("");
    try {
      let res = meetingService.getScheduledMeetings
        ? await meetingService.getScheduledMeetings()
        : null;

      if (!res || !Array.isArray(res?.data)) {
        if (meetingService.getRecentMeetings)
          res = await meetingService.getRecentMeetings();
        else res = await meetingService.getActiveMeetings();
      }

      const arr = Array.isArray(res?.data) ? res.data : [];
      const list = arr
        .map((m) => ({
          meetingId: m.meetingId || m.id || String(Math.random()),
          title: m.title || "Untitled Meeting",
          status: (m.status || "scheduled").toLowerCase(),
          startTime: m.startTime || m.start_time || m.scheduledAt || null,
          participants: m.participants || 0,
        }))
        .filter((m) => m.status === "scheduled" || m.status === "waiting")
        .sort((a, b) => {
          const da = a.startTime ? new Date(a.startTime).getTime() : Infinity;
          const db = b.startTime ? new Date(b.startTime).getTime() : Infinity;
          return da - db;
        });

      setScheduled(list);
    } catch (e) {
      setErrScheduled(String(e.message || e));
    } finally {
      setLoadingScheduled(false);
    }
  }, [meetingService]);

  useEffect(() => {
    loadScheduled();
  }, [loadScheduled]);

  const startScheduledMeeting = useCallback(
    async (m) => {
      setErrScheduled("");
      try {
        if (meetingService.startMeeting) {
          const res = await meetingService.startMeeting(m.meetingId);
          if (!res?.success)
            throw new Error(res?.message || "Failed to start meeting");
        }
        setScheduled((prev) => prev.filter((x) => x.meetingId !== m.meetingId));
        localStorage.setItem(
          "currentMeeting",
          JSON.stringify({
            id: m.meetingId,
            code: m.meetingId,
            title: m.title,
            status: "started",
          })
        );
        navigate("/waiting");
      } catch (e) {
        setErrScheduled(String(e.message || e));
      }
    },
    [meetingService, navigate]
  );

  // ===== history (lazy)
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errHistory, setErrHistory] = useState("");

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    setErrHistory("");
    try {
      const res = await meetingService.getMyMeetings();
      const arr = Array.isArray(res?.data) ? res.data : [];
      const list = arr
        .map((m) => ({
          meetingId: m.meetingId || m.id || String(Math.random()),
          title: m.title || "Untitled Meeting",
          status: (m.status || "ended").toLowerCase(),
          startTime: m.startTime || m.start_time || m.scheduledAt || null,
          participants: m.participants || 0,
        }))
        .filter((m) => m.status === "ended")
        .sort((a, b) => {
          const da = a.startTime ? new Date(a.startTime).getTime() : 0;
          const db = b.startTime ? new Date(b.startTime).getTime() : 0;
          return db - da;
        });
      setHistory(list);
    } catch (e) {
      setErrHistory(String(e.message || e));
    } finally {
      setLoadingHistory(false);
    }
  }, [meetingService]);

  // ===== join default room
  const [joiningDefault, setJoiningDefault] = useState(false);
  const [errJoinDefault, setErrJoinDefault] = useState("");

  const joinDefaultAsHost = useCallback(async () => {
    setJoiningDefault(true);
    setErrJoinDefault("");
    try {
      const res = await meetingService.joinDefaultMeeting();
      if (!res?.success)
        throw new Error(res?.message || "Failed to join default room");

      const info = res.data || (await meetingService.getDefaultMeeting()).data;
      const meetingInfo = {
        id: info.meetingId,
        code: info.meetingId,
        title: info.title || "UP-CONNECT Default Room",
        status: info.status || "started",
        isDefault: true,
      };
      localStorage.setItem("currentMeeting", JSON.stringify(meetingInfo));
      localStorage.setItem(
        "pconf.displayName",
        hostName || displayName || user?.username || "Host"
      );
      navigate("/waiting");
    } catch (e) {
      setErrJoinDefault(String(e.message || e));
    } finally {
      setJoiningDefault(false);
    }
  }, [meetingService, navigate, hostName, displayName, user]);

  // ===== create / quick start (plus upload materials)
  const [creating, setCreating] = useState(false);
  const [errCreate, setErrCreate] = useState("");

  const uploadMaterialsFiles = useCallback(
    async (meetingId, materials) => {
      const token = localStorage.getItem("token");
      for (const material of materials) {
        const formData = new FormData();
        formData.append("file", material);
        const res = await fetch(
          `${API_URL}/api/materials/upload/${meetingId}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          }
        );
        if (!res.ok) {
          const txt = await res.text().catch(() => res.statusText);
          throw new Error(`Upload failed for ${material.name}: ${txt}`);
        }
      }
    },
    [API_URL]
  );

  const saveMeetingPayload = useCallback(
    async (payload) => {
      try {
        setCreating(true);
        setErrCreate("");
        const result = await meetingService.createMeeting(payload);
        if (!result?.success)
          throw new Error(result?.message || "Failed to create meeting");

        if (payload.materials?.length) {
          try {
            await uploadMaterialsFiles(
              result.data.meetingId,
              payload.materials
            );
          } catch (e) {
            console.warn("Materials upload failed:", e); /* warning only */
          }
        }

        closeWizard();

        if (payload.isQuickStart) {
          const info = {
            id: result.data.meetingId,
            code: result.data.meetingId,
            title: result.data.title || payload.title,
            status: "started",
          };
          localStorage.setItem("currentMeeting", JSON.stringify(info));
          navigate("/waiting");
          return;
        }

        // selesai schedule → refresh daftar terjadwal
        loadScheduled();
      } catch (e) {
        setErrCreate(String(e.message || e));
      } finally {
        setCreating(false);
      }
    },
    [meetingService, navigate, uploadMaterialsFiles, loadScheduled]
  );

  // ===== logout flow (via modal provider)
  const handleLogout = useCallback(async () => {
    const ok = await modal.confirm({
      title: "Logout from dashboard?",
      message: "You will be signed out and redirected to the login page.",
      destructive: true,
      okText: "Logout",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          if (window.simpleScreenShare?.isSharing)
            window.simpleScreenShare.stopScreenShare();
        } catch {}
        try {
          if (window.meetingWebSocket?.readyState === WebSocket.OPEN)
            window.meetingWebSocket.close();
        } catch {}
        try {
          if (window.electronAPI?.disconnectFromControlServer)
            window.electronAPI.disconnectFromControlServer();
        } catch {}
        try {
          if (typeof meetingService.logout === "function")
            await meetingService.logout();
        } catch {}
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("currentMeeting");
      },
    });
    if (ok) {
      await modal.notify({
        variant: "success",
        title: "Signed out",
        message: "See you soon.",
        autoCloseMs: 900,
      });
      navigate("/");
    }
  }, [modal, meetingService, navigate]);

  // ===== helpers to clear errors
  const clearJoinDefaultErr = () => setErrJoinDefault("");
  const clearCreateErr = () => setErrCreate("");

  return {
    // meta
    user,
    displayName,
    hostName,

    // view & wizard
    viewMode,
    setViewMode,
    showWizard,
    isQuickStartWizard,
    openQuickStart,
    openScheduleWizard,
    closeWizard,

    // scheduled
    scheduled,
    loadingScheduled,
    errScheduled,
    startScheduledMeeting,
    refreshScheduled: loadScheduled,

    // history
    history,
    loadingHistory,
    errHistory,
    fetchHistory,

    // default room
    joiningDefault,
    errJoinDefault,
    joinDefaultAsHost,
    clearJoinDefaultErr,

    // create
    creating,
    saveMeetingPayload,
    errCreate,
    clearCreateErr,

    // actions
    handleLogout,
  };
}
