import React, { useEffect, useMemo, useState } from "react";
import "./participant-dashboard.css";
import { API_URL } from "../../../config.js";
import { useNavigate } from "react-router-dom";
import Icon from "../../../components/Icon.jsx";
import meetingService from "../../../services/meetingService.js";
import useMeetingGuard from "../../../hooks/useMeetingGuard.js";
import MeetingFooter from "../../../components/MeetingFooter.jsx";

export default function ParticipantDashboard() {
  const [user, setUser] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    const savedName = localStorage.getItem("pconf.displayName");
    if (savedName) {
      setDisplayName(savedName);
    }

    // Get current meeting info
    const meetingRaw = localStorage.getItem("currentMeeting");
    if (meetingRaw) {
      try {
        const meeting = JSON.parse(meetingRaw);
        setCurrentMeeting(meeting);

        // Immediately check meeting status when component mounts
        if (meeting?.meetingId || meeting?.id) {
          const meetingId = meeting?.meetingId || meeting?.id;
          checkMeetingStatusImmediately(meetingId);
        }
      } catch (e) {
        console.error("Failed to parse meeting info:", e);
      }
    }
  }, []);

  // Immediate check meeting status when component mounts
  const checkMeetingStatusImmediately = async (meetingId) => {
    try {
      console.log(`Immediate check meeting status for meeting ${meetingId}...`);
      const result = await meetingService.checkMeetingStatus(meetingId);

      console.log("Immediate meeting status check result:", result);

      // Jika meeting sudah ended, langsung exit
      if (result?.data?.status === "ended") {
        console.log("Meeting already ended, immediate exit...");
        localStorage.removeItem("currentMeeting");
        alert("Meeting telah berakhir. Anda akan dikeluarkan dari meeting.");
        navigate("/start");
        return;
      }

      // Jika meeting tidak aktif, juga exit
      if (!result?.data?.isActive) {
        console.log("Meeting not active, immediate exit...");
        localStorage.removeItem("currentMeeting");
        alert("Meeting tidak aktif. Anda akan dikeluarkan dari meeting.");
        navigate("/start");
        return;
      }
    } catch (error) {
      console.error("Error in immediate meeting status check:", error);

      // Jika error 404, meeting mungkin sudah dihapus
      if (
        error.message.includes("404") ||
        error.message.includes("not found")
      ) {
        console.log("Meeting not found, immediate exit...");
        localStorage.removeItem("currentMeeting");
        alert("Meeting tidak ditemukan. Anda akan dikeluarkan dari meeting.");
        navigate("/start");
        return;
      }
    }
  };

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${API_URL}/api/menu/user/menus`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        const list = Array.isArray(json?.data)
          ? json.data.map((m) => ({
              menu_id: m.menuId,
              display_label: m.displayLabel,
              slug: m.slug,
              flag: m.flag ?? "Y",

              iconUrl: m.iconMenu || null,
              parent: m.parentMenu,
              seq: m.sequenceMenu,
            }))
          : [];
        if (!cancel) setMenus(list);
      } catch (e) {
        if (!cancel) setErr(String(e.message || e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [API_URL]);

  const visibleMenus = useMemo(
    () => (menus || []).filter((m) => (m?.flag ?? "Y") === "Y"),
    [menus]
  );

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("pconf.displayName");
    localStorage.removeItem("pconf.useAccountName");
    localStorage.removeItem("currentMeeting");
    window.location.href = "/";
  };

  const handleLeaveMeeting = async () => {
    if (window.confirm("Are you sure you want to leave this meeting?")) {
      try {
        // Get the actual meeting ID from currentMeeting
        const meetingId = currentMeeting?.meetingId || currentMeeting?.id;

        if (!meetingId) {
          alert("Meeting ID not found. Cannot leave meeting.");
          return;
        }

        // Call the API to leave the meeting
        await meetingService.leaveMeeting(meetingId);

        // Clear local storage and redirect
        localStorage.removeItem("currentMeeting");
        alert("Left meeting successfully!");
        navigate("/start");
      } catch (error) {
        console.error("Failed to leave meeting:", error);
        alert(`Failed to leave meeting: ${error.message}`);
      }
    }
  };

  const handleTileClick = (menu) => {
    console.log("open", menu.slug);
    navigate(`/menu/${menu.slug}`);
  };

  const meetingId = currentMeeting?.id || "MTG-001";

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  return (
    <div className="pd-app centered-page">
      <header className="pd-topbar">
        <div className="pd-left">
          <span className="pd-live" aria-hidden />
          <div>
            <h1 className="pd-title">Conference Meeting</h1>
            <div className="pd-sub">ID: {meetingId}</div>
          </div>
        </div>
        <div className="pd-right">
          <div className="pd-clock" aria-live="polite">
            {new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div className="pd-user">
            <div className="pd-avatar">
              {(displayName || user?.username || "User")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <div className="pd-user-name">
                {displayName || user?.username || "Participant"}
              </div>
              <div className="pd-user-role">{user?.role}</div>
            </div>
            <button className="pd-ghost" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="pd-main">
        <section className="pd-panel pd-dock">
          {loading && <div className="pd-empty">Loading menus…</div>}
          {err && !loading && (
            <div className="pd-error">Gagal memuat menu: {err}</div>
          )}

          {!loading && !err && (
            <div className="pd-grid">
              {visibleMenus.map((m) => (
                <button
                  key={m.menu_id || m.slug}
                  className="pd-tile"
                  onClick={() => handleTileClick(m)}
                  aria-label={m.display_label || m.slug}
                >
                  <span className="pd-tile-icon" aria-hidden>
                    <Icon slug={m.slug} iconUrl={m.iconUrl} />
                  </span>
                  <span className="pd-tile-label">{m.display_label}</span>
                </button>
              ))}
              {visibleMenus.length === 0 && (
                <div className="pd-empty">Tidak ada menu untuk role ini.</div>
              )}
            </div>
          )}
        </section>
      </main>

      <MeetingFooter
        userRole={user?.role || "participant"}
        onLeaveMeeting={handleLeaveMeeting}
        // contoh toggle kalau nanti ada state mic/cam:
        // micOn={micOn}
        // camOn={camOn}
        // onToggleMic={() => setMicOn(v => !v)}
        // onToggleCam={() => setCamOn(v => !v)}
        
        onHelpClick={() => alert("Contact support")}
      />
    </div>
  );
}
