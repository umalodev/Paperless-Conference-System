import React from "react";
import { useNavigate } from "react-router-dom";
import meetingService from "../../../services/meetingService";

export default function useStartPage() {
  const [user, setUser] = React.useState(null);
  const [role, setRole] = React.useState("participant");
  const [username, setUsername] = React.useState("");
  const [useAccountName, setUseAccountName] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const navigate = useNavigate();

  // Load user
  React.useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return;
    try {
      const u = JSON.parse(raw);
      setUser(u);
      const detectedRole = (
        u?.role?.name ||
        u?.role ||
        u?.user_role ||
        u?.userRole ||
        u?.role_name ||
        ""
      )
        .toString()
        .toLowerCase();
      setRole(detectedRole === "host" ? "host" : "participant");
    } catch {
      /* ignore */
    }
    const savedUse = localStorage.getItem("pconf.useAccountName") === "1";
    const savedName = localStorage.getItem("pconf.displayName") || "";
    setUseAccountName(savedUse);
    if (!savedUse) setUsername(savedName);
  }, []);

  // Update username saat toggle
  React.useEffect(() => {
    if (useAccountName && user) {
      const accountName =
        user?.username ||
        user?.name ||
        user?.full_name ||
        (user?.email ? user.email.split("@")[0] : "") ||
        "";
      setUsername(accountName);
      localStorage.setItem("pconf.displayName", accountName);
      localStorage.setItem("pconf.useAccountName", "1");
    } else {
      localStorage.removeItem("pconf.useAccountName");
    }
  }, [useAccountName, user]);

  const handleChangeUsername = (e) => {
    const val = e.target.value;
    setUsername(val);
    if (!useAccountName) {
      localStorage.setItem("pconf.displayName", val);
    }
  };

  const isHost = role === "host";
  const intentText = isHost ? "Host a meeting" : "Join a meeting";
  const ctaText = isHost ? "Set Meeting" : "Join Meeting";

  const setMeetingLocalName = (meetingId, name) => {
    const n = (name || "").trim();
    localStorage.setItem(`meeting:${meetingId}:displayName`, n);
    localStorage.setItem("displayName", n);
    localStorage.setItem("currentMeetingId", String(meetingId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      localStorage.setItem("pconf.displayName", username || "");
      localStorage.setItem("pconf.useAccountName", useAccountName ? "1" : "0");

      const token = localStorage.getItem("token");

      if (isHost) {
        const resp = await meetingService.hostSmartEnter(username);
        if (resp?.data?.mode === "rejoin_or_started") {
          const info = {
            id: resp.data.meetingId,
            code: resp.data.meetingId,
            title: resp.data.title || "My Meeting",
            status: resp.data.status || "started",
          };
          localStorage.setItem("currentMeeting", JSON.stringify(info));
          setMeetingLocalName(info.id, username);
          navigate("/waiting");
          return;
        }

        if (resp?.data?.mode === "scheduled_not_started") {
          await meetingService.startMeeting(resp.data.meetingId);
          const info = {
            id: resp.data.meetingId,
            code: resp.data.meetingId,
            title: resp.data.title || "My Meeting",
            status: "started",
          };
          localStorage.setItem("currentMeeting", JSON.stringify(info));
          setMeetingLocalName(info.id, username);
          navigate("/waiting");
          return;
        }

        navigate("/setup");
        return;
      }

      const publicActives = await meetingService.getPublicActiveMeetings();
      let picked =
        publicActives?.data?.find((m) => !m.isDefault) ||
        publicActives?.data?.[0] ||
        null;

      if (picked && !picked.isDefault) {
        const info = {
          id: picked.meetingId,
          code: picked.meetingId,
          title: picked.title || "Active Meeting",
          status: picked.status || "started",
        };
        localStorage.setItem("currentMeeting", JSON.stringify(info));
        setMeetingLocalName(info.id, username);
        navigate("/waiting");
        return;
      }

      const joinDefault = await meetingService.joinDefaultMeeting();
      if (!joinDefault?.success)
        throw new Error(
          joinDefault?.message || "Failed to join default meeting."
        );

      const defInfo =
        joinDefault.data || (await meetingService.getDefaultMeeting()).data;
      const info = {
        id: defInfo.meetingId,
        code: defInfo.meetingId,
        title: defInfo.title || "Default Room",
        status: defInfo.status || "started",
      };
      localStorage.setItem("currentMeeting", JSON.stringify(info));
      setMeetingLocalName(info.id, username);
      navigate("/waiting");
    } catch (err) {
      console.error(err);
      setError(err.message || "Error occurred");
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    role,
    username,
    useAccountName,
    loading,
    error,
    handleChangeUsername,
    setUseAccountName,
    handleSubmit,
    intentText,
    ctaText,
  };
}
