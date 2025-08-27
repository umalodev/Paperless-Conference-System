import React, { useEffect, useMemo, useState } from "react";
import "./participant-dashboard.css";
import { API_URL } from "../../../config.js";
import { useNavigate } from "react-router-dom";
import Icon from "../../../components/Icon.jsx";
import meetingService from "../../../services/meetingService.js";

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
      
      console.log('Immediate meeting status check result:', result);

      // Jika meeting sudah ended, langsung exit
      if (result?.data?.status === 'ended') {
        console.log('Meeting already ended, immediate exit...');
        localStorage.removeItem("currentMeeting");
        alert('Meeting telah berakhir. Anda akan dikeluarkan dari meeting.');
        navigate("/start");
        return;
      }

      // Jika meeting tidak aktif, juga exit
      if (!result?.data?.isActive) {
        console.log('Meeting not active, immediate exit...');
        localStorage.removeItem("currentMeeting");
        alert('Meeting tidak aktif. Anda akan dikeluarkan dari meeting.');
        navigate("/start");
        return;
      }

    } catch (error) {
      console.error('Error in immediate meeting status check:', error);
      
      // Jika error 404, meeting mungkin sudah dihapus
      if (error.message.includes('404') || error.message.includes('not found')) {
        console.log('Meeting not found, immediate exit...');
        localStorage.removeItem("currentMeeting");
        alert('Meeting tidak ditemukan. Anda akan dikeluarkan dari meeting.');
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

  // Polling untuk check meeting status (auto-exit ketika meeting ended)
  useEffect(() => {
    if (!currentMeeting?.meetingId && !currentMeeting?.id) return;

    const meetingId = currentMeeting?.meetingId || currentMeeting?.id;
    let cancel = false;
    let intervalId;

    const checkStatus = async () => {
      try {
        if (cancel) return;
        
        console.log(`Checking meeting status for meeting ${meetingId}...`);
        const result = await meetingService.checkMeetingStatus(meetingId);
        
        if (cancel) return;

        console.log('Meeting status result:', result);

        // Jika meeting sudah ended, auto-exit
        if (result?.data?.status === 'ended') {
          console.log('Meeting ended, auto-exiting participant...');
          
          // Clear local storage
          localStorage.removeItem("currentMeeting");
          
          // Alert dan redirect
          alert('Meeting telah berakhir. Anda akan dikeluarkan dari meeting.');
          navigate("/start");
          return;
        }

        // Jika meeting tidak aktif, juga exit
        if (!result?.data?.isActive) {
          console.log('Meeting not active, auto-exiting participant...');
          
          // Clear local storage
          localStorage.removeItem("currentMeeting");
          
          // Alert dan redirect
          alert('Meeting tidak aktif. Anda akan dikeluarkan dari meeting.');
          navigate("/start");
          return;
        }

      } catch (error) {
        console.error('Error checking meeting status:', error);
        
        if (cancel) return;

        // Jika error 404 (meeting tidak ditemukan), meeting mungkin sudah dihapus
        if (error.message.includes('404') || error.message.includes('not found')) {
          console.log('Meeting not found, auto-exiting participant...');
          
          // Clear local storage
          localStorage.removeItem("currentMeeting");
          
          // Alert dan redirect
          alert('Meeting tidak ditemukan. Anda akan dikeluarkan dari meeting.');
          navigate("/start");
          return;
        }

        // Untuk error lain, log saja tapi jangan exit
        console.warn('Meeting status check failed, but continuing:', error.message);
      }
    };

    // Check status setiap 5 detik (lebih responsif)
    intervalId = setInterval(checkStatus, 5000);
    
    // Check status pertama kali
    checkStatus();

    return () => {
      cancel = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentMeeting, navigate]);

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

  const handleEndMeeting = async () => {
    if (window.confirm("Are you sure you want to end this meeting?")) {
      try {
        // Get the actual meeting ID from currentMeeting
        const meetingId = currentMeeting?.meetingId || currentMeeting?.id;
        
        if (!meetingId) {
          alert("Meeting ID not found. Cannot end meeting.");
          return;
        }

        // Call the API to end the meeting
        await meetingService.endMeeting(meetingId);
        
        // Clear local storage and redirect
        localStorage.removeItem("currentMeeting");
        alert("Meeting ended successfully!");
        navigate("/start");
      } catch (error) {
        console.error("Failed to end meeting:", error);
        alert(`Failed to end meeting: ${error.message}`);
      }
    }
  };

  const handleTileClick = (menu) => {
    console.log("open", menu.slug);
    navigate(`/menu/${menu.slug}`);
  };

  const meetingId = currentMeeting?.id || "MTG-001";
  const meetingCode = currentMeeting?.code || "MTG-001";

  return (
    <div className="pd-app">
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
        <section className="pd-panel">
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

      <footer className="pd-bottombar">
        <div className="pd-controls-left">
          <button className="pd-ctrl" title="Mic">
            {getIcon("mic")}
          </button>
          <button className="pd-ctrl" title="Camera">
            {getIcon("camera")}
          </button>
          <button className="pd-ctrl" title="Settings">
            {getIcon("settings")}
          </button>
        </div>
        <div className="pd-controls-right">
          <button className="pd-ghost">Menu</button>
          <button className="pd-danger" onClick={handleEndMeeting}>
            End Meeting
          </button>
          <button className="pd-fab" title="Help">
            ?
          </button>
        </div>
      </footer>
    </div>
  );
}

function getIcon(slug = "") {
  const props = {
    className: "pd-svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (slug.toLowerCase()) {
    case "mic":
      return (
        <svg {...props}>
          <rect x="9" y="2" width="6" height="11" rx="3" />
          <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
          <path d="M12 19v3" />
        </svg>
      );
    case "camera":
      return (
        <svg {...props}>
          <rect x="3" y="6" width="13" height="12" rx="3" />
          <path d="M16 10l5-3v10l-5-3z" />
        </svg>
      );
    case "settings":
      return (
        <svg {...props}>
          <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 3.21 17l.06-.06a1.65 1.65 0 0 0-1.82.33 1.65 1.65 0 0 0-1.51-1H2a2 2 0 1 1 0-4h.09c.67 0 1.28-.39 1.51-1 .28-.68.14-1.35-.33-1.82l-.06-.06A2 2 0 1 1 6.04 3.21l.06.06c.47.47 1.14.61 1.82.33.61-.23 1-.84 1.09-1.51V2a2 2 0 1 1 4 0v.09c0 .67.39 1.28 1 1.51.68.28 1.35.14 1.82-.33l.06-.06A2 2 0 1 1 20.79 6.04l-.06.06c-.47.47-.61 1.14-.33 1.82.23.61.84 1 1.51 1.09H22a2 2 0 1 1 0 4h-.09c-.67 0-1.28.39-1.51 1z" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <rect x="4" y="4" width="16" height="16" rx="4" />
        </svg>
      );
  }
}
