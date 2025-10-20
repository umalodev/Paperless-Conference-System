import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import meetingService from "../../../services/meetingService";
import meetingSocketService from "../../../services/meetingSocketService";
import { API_URL } from "../../../config";

export default function useMeetingRoom() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("participant");
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const [participants, setParticipants] = useState([]);
  const navigate = useNavigate();

  const { meetingId, meetingCode } = useMemo(() => {
    if (!currentMeeting) return { meetingId: null, meetingCode: "—" };
    return {
      meetingId: currentMeeting.id || currentMeeting.meetingId,
      meetingCode: currentMeeting.code || currentMeeting.meetingCode || "—",
    };
  }, [currentMeeting]);

  // Load user + meeting info from localStorage
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setUser(u);
        const r = (
          u?.role?.name ||
          u?.role ||
          u?.user_role ||
          u?.userRole ||
          u?.role_name ||
          ""
        )
          .toString()
          .toLowerCase();
        setRole(r === "host" ? "host" : "participant");
      } catch {}
    }
    setDisplayName(localStorage.getItem("pconf.displayName") || "");
    const meetingRaw = localStorage.getItem("currentMeeting");
    if (meetingRaw) {
      try {
        setCurrentMeeting(JSON.parse(meetingRaw));
      } catch {}
    }
  }, []);

  // Socket connection
  useEffect(() => {
    if (!meetingId || !user) return;
    const handleSocketMessage = (msg) => {
      if (!msg?.type) return;
      if (msg.type === "participant_joined") {
        setParticipants((prev) =>
          prev.some((p) => p.participantId === msg.participantId)
            ? prev
            : [
                ...prev,
                {
                  participantId: msg.participantId,
                  displayName: msg.displayName,
                },
              ]
        );
      }
      if (msg.type === "participant_left") {
        setParticipants((prev) =>
          prev.filter((p) => p.participantId !== msg.participantId)
        );
      }
      if (msg.type === "participants_list") setParticipants(msg.data || []);
    };

    meetingSocketService.on("message", handleSocketMessage);
    meetingSocketService.connect(meetingId, user.id, API_URL);

    return () => {
      meetingSocketService.off("message", handleSocketMessage);
      meetingSocketService.disconnect();
    };
  }, [meetingId, user]);

  // Sync display name periodically
  useEffect(() => {
    const pushName = async () => {
      if (!meetingId) return;
      const name = (localStorage.getItem("pconf.displayName") || "").trim();
      if (!name) return;
      try {
        await meetingService.setParticipantDisplayName({
          meetingId,
          displayName: name,
        });
      } catch {}
    };
    pushName();
    const interval = setInterval(pushName, 5000);
    return () => clearInterval(interval);
  }, [meetingId]);

  // Poll meeting status
  useEffect(() => {
    let cancel = false;
    let timer;

    const fetchStatus = async () => {
      try {
        setErr("");
        if (!meetingId) return;
        const result = await meetingService.getMeetingStatus(meetingId);
        if (cancel) return;
        const on = !!(
          result?.data?.isActive ??
          result?.data?.started ??
          result?.started
        );
        setStarted(on);
        if (on) {
          try {
            await meetingService.autoJoinMeeting(meetingId);
          } catch {}
        }
      } catch (e) {
        if (!cancel) {
          const msg = String(e.message || e);
          if (msg.toLowerCase().includes("not found"))
            setErr("Meeting belum tersedia. Menunggu host memulai…");
          else setErr(msg);
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    };

    if (meetingId) {
      fetchStatus();
      if (role !== "host") timer = setInterval(fetchStatus, 3000);
    } else setLoading(false);

    return () => {
      cancel = true;
      if (timer) clearInterval(timer);
    };
  }, [meetingId, role]);

  // Auto-redirect when meeting starts
  useEffect(() => {
    const ensureDisplayNameBeforeJoin = async () => {
      if (!loading && started && meetingId) {
        const name = (localStorage.getItem("pconf.displayName") || "").trim();
        if (name) {
          try {
            await meetingService.setParticipantDisplayName({
              meetingId,
              displayName: name,
            });
          } catch {}
        }
        navigate("/participant/dashboard");
      }
    };
    ensureDisplayNameBeforeJoin();
  }, [started, loading, meetingId, navigate]);

  const handleStart = async () => {
    if (!meetingId) {
      setErr("No meeting ID available");
      return;
    }
    setActionLoading(true);
    setErr("");
    try {
      const result = await meetingService.startMeeting(meetingId);
      if (result.success) setStarted(true);
      else throw new Error(result.message || "Failed to start meeting");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setActionLoading(false);
    }
  };

  const leave = () => {
    localStorage.removeItem("currentMeeting");
    navigate("/start");
  };

  const who = displayName || user?.username || user?.name || "You";

  return {
    user,
    role,
    meetingId,
    meetingCode,
    started,
    loading,
    err,
    actionLoading,
    currentMeeting,
    participants,
    who,
    handleStart,
    leave,
  };
}
