// ==========================================================
// 📄 ParticipantDashboard.jsx (FINAL MERGED VERSION)
// ==========================================================
import React, { useEffect, useMemo, useState, useCallback } from "react";
import "./participant-dashboard.css";
import { API_URL } from "../../../config.js";
import { useNavigate } from "react-router-dom";
import Icon from "../../../components/Icon.jsx";
import meetingService from "../../../services/meetingService.js";
import useMeetingGuard from "../../../hooks/useMeetingGuard.js";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import { useMediaRoom } from "../../../contexts/MediaRoomContext.jsx";
import { useModal } from "../../../contexts/ModalProvider.jsx";
import meetingSocketService from "../../../services/meetingSocketService.js";
import { cleanupAllMediaAndRealtime } from "../../../utils/mediaCleanup.js";
import MeetingLayout from "../../../components/MeetingLayout.jsx";

export default function ParticipantDashboard() {
  // ==========================================================
  // 🧩 STATE
  // ==========================================================
  const [user, setUser] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const navigate = useNavigate();
  const { confirm, notify } = useModal();

  const mediaRoom = useMediaRoom?.() || null;

  // ==========================================================
  // 🔔 BADGE MAP
  // ==========================================================
  const [badgeMap, setBadgeMap] = useState(() => {
    try {
      const x = localStorage.getItem("badge.map");
      return x ? JSON.parse(x) : {};
    } catch {
      return {};
    }
  });

  const setBadgeLocal = useCallback((slug, value) => {
    try {
      const key = "badge.map";
      const raw = localStorage.getItem(key);
      const map = raw ? JSON.parse(raw) : {};
      map[slug] = value;
      localStorage.setItem(key, JSON.stringify(map));
      window.dispatchEvent(new Event("badge:changed"));
    } catch {}
  }, []);

  useEffect(() => {
    const apply = () => {
      try {
        const x = localStorage.getItem("badge.map");
        setBadgeMap(x ? JSON.parse(x) : {});
      } catch {}
    };
    const onStorage = (e) => {
      if (e.key === "badge.map") apply();
    };
    const onCustom = () => apply();
    window.addEventListener("storage", onStorage);
    window.addEventListener("badge:changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("badge:changed", onCustom);
    };
  }, []);

  // ==========================================================
  // 🧠 LOAD USER + MEETING INFO
  // ==========================================================
  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));

    const savedName = localStorage.getItem("pconf.displayName");
    if (savedName) setDisplayName(savedName);

    const meetingRaw = localStorage.getItem("currentMeeting");
    if (meetingRaw) {
      try {
        const meeting = JSON.parse(meetingRaw);
        setCurrentMeeting(meeting);
        if (meeting?.meetingId || meeting?.id) {
          checkMeetingStatusImmediately(meeting.meetingId || meeting.id);
        }
      } catch (e) {
        console.error("Failed to parse meeting info:", e);
      }
    }
  }, []);

  // ==========================================================
  // 🔍 CHECK MEETING STATUS
  // ==========================================================
  const checkMeetingStatusImmediately = async (meetingId) => {
    try {
      console.log(`Immediate check meeting status for meeting ${meetingId}...`);
      const result = await meetingService.checkMeetingStatus(meetingId);

      const disconnectAndExit = (reasonMsg) => {
        console.log(`🛑 ${reasonMsg}`);
        try {
          if (window.electronAPI?.disconnectFromControlServer) {
            window.electronAPI.disconnectFromControlServer();
          }
        } catch {}
        localStorage.removeItem("currentMeeting");
        alert(reasonMsg);
        navigate("/start");
      };

      if (result?.data?.status === "ended") {
        disconnectAndExit("Meeting telah berakhir. Anda akan dikeluarkan dari meeting.");
        return;
      }
      if (!result?.data?.isActive) {
        disconnectAndExit("Meeting tidak aktif. Anda akan dikeluarkan dari meeting.");
        return;
      }
    } catch (error) {
      if (error.message.includes("404") || error.message.includes("not found")) {
        try {
          if (window.electronAPI?.disconnectFromControlServer) {
            window.electronAPI.disconnectFromControlServer();
          }
        } catch {}
        localStorage.removeItem("currentMeeting");
        alert("Meeting tidak ditemukan. Anda akan dikeluarkan dari meeting.");
        navigate("/start");
        return;
      }
    }
  };

  // ==========================================================
  // 🔌 SOCKET.IO CONNECTION
  // ==========================================================
  useEffect(() => {
    const meetingId = currentMeeting?.meetingId || currentMeeting?.id;
    if (!meetingId || !user) return;

    const nameFromLocal = localStorage.getItem("pconf.displayName");
    if (!nameFromLocal && !displayName) {
      console.log("⏳ Menunggu displayName tersedia sebelum connect...");
      return;
    }

    const latestDisplayName = nameFromLocal || displayName || user?.username || "User";

    // cleanup listener lama
    meetingSocketService.off("participant_joined");
    meetingSocketService.off("participant_left");
    meetingSocketService.socket?.off("connect");

    if (!meetingSocketService.isConnected()) {
      console.log("🔌 Connecting to socket with name:", latestDisplayName);
      meetingSocketService.connect(meetingId, user.id, API_URL);
    }

    const onConnected = () => {
      const joinPayload = {
        type: "join-room",
        meetingId,
        userId: user.id,
        displayName: latestDisplayName,
      };
      meetingSocketService.send(joinPayload);
      console.log("✅ Joined meeting via socket:", joinPayload);
    };

    const handleJoin = (data) => {
      console.log("👥 Participant joined:", data.displayName);
      notify({
        variant: "info",
        title: "Participant Joined",
        message: `${data.displayName} just joined.`,
        autoCloseMs: 1500,
      });
    };

    const handleLeft = (data) => {
      console.log("🚪 Participant left:", data.displayName);
      notify({
        variant: "warning",
        title: "Participant Left",
        message: `${data.displayName} left the meeting.`,
        autoCloseMs: 1500,
      });
    };

    meetingSocketService.socket?.on("connect", onConnected);
    meetingSocketService.on("participant_joined", handleJoin);
    meetingSocketService.on("participant_left", handleLeft);

    return () => {
      meetingSocketService.socket?.off("connect", onConnected);
      meetingSocketService.off("participant_joined", handleJoin);
      meetingSocketService.off("participant_left", handleLeft);
    };
  }, [currentMeeting?.id, user?.id, displayName, notify]);

  // ==========================================================
  // 📋 LOAD MENUS
  // ==========================================================
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${API_URL}/api/menu/user/menus`, {
          headers: meetingService.getAuthHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = Array.isArray(json?.data)
          ? json.data.map((m) => ({
              menuId: m.menuId,
              slug: m.slug,
              label: m.displayLabel,
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
  }, []);

  // ==========================================================
  // 🎤 MEDIA CONTROL
  // ==========================================================
  const { ready: mediaReady, micOn, camOn, startMic, stopMic, startCam, stopCam } =
    useMediaRoom();

  const onToggleMic = useCallback(() => {
    if (!mediaReady) return;
    micOn ? stopMic() : startMic();
  }, [mediaReady, micOn, startMic, stopMic]);

  const onToggleCam = useCallback(() => {
    if (!mediaReady) return;
    camOn ? stopCam() : startCam();
  }, [mediaReady, camOn, startCam, stopCam]);

  // ==========================================================
  // 📤 LOGOUT HANDLER
  // ==========================================================
  const handleLogout = async () => {
    const ok = await confirm({
      title: "Logout dari sesi ini?",
      message: "Anda akan keluar dan kembali ke halaman awal.",
      destructive: true,
      okText: "Logout",
      cancelText: "Batal",
    });

    if (!ok) return;

    try {
      const meetingId = currentMeeting?.meetingId || currentMeeting?.id || currentMeeting?.code;

      try {
        await meetingSocketService.disconnect(true);
        await new Promise((r) => setTimeout(r, 400));
      } catch {}

      if (micOn) await stopMic().catch(() => {});
      if (camOn) await stopCam().catch(() => {});

      await cleanupAllMediaAndRealtime({ mediaRoom }).catch(() => {});

      try {
        if (window.electronAPI?.disconnectFromControlServer) {
          window.electronAPI.disconnectFromControlServer();
        }
      } catch {}

      try {
        if (meetingId) await meetingService.leaveMeeting(meetingId);
      } catch {}

      try {
        if (typeof meetingService.logout === "function") {
          await meetingService.logout();
        }
      } catch {}

      await notify({
        variant: "success",
        title: "Signed out",
        message: "See you soon 👋",
        autoCloseMs: 900,
      });

      navigate("/", { replace: true });
    } catch (e) {
      console.error("Logout error:", e);
      localStorage.clear();
      sessionStorage.clear();
      navigate("/", { replace: true });
    }
  };

  // ==========================================================
  // 🧭 UI + BADGE TILE
  // ==========================================================
  const visibleMenus = useMemo(
    () =>
      (menus || [])
        .filter((m) => (m?.flag ?? "Y") === "Y")
        .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999)),
    [menus]
  );

  const handleTileClick = (menu) => navigate(`/menu/${menu.slug}`);

  const meetingIdDisplay = currentMeeting?.id || "MTG-001";
  const activeMeetingId =
    currentMeeting?.meetingId || currentMeeting?.id || currentMeeting?.code || null;

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  // ==========================================================
  // 🧱 RENDER
  // ==========================================================
  return (
    <MeetingLayout
      meetingId={activeMeetingId}
      userId={user?.id || user?.userId || null}
      userRole={user?.role || "participant"}
      disableMeetingSocket={true}
      badgeMap={badgeMap}
      setBadgeLocal={setBadgeLocal}
      meetingTitle={
        (() => {
          try {
            const raw = localStorage.getItem("currentMeeting");
            const cm = raw ? JSON.parse(raw) : null;
            return cm?.title || `Meeting #${meetingIdDisplay}`;
          } catch {
            return `Meeting #${meetingIdDisplay}`;
          }
        })()
      }
    >
      <div className="pd-app centered-page">
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <div>
              <h1 className="pd-title">
                {(() => {
                  try {
                    const raw = localStorage.getItem("currentMeeting");
                    const cm = raw ? JSON.parse(raw) : null;
                    return cm?.title || `Meeting #${meetingIdDisplay}`;
                  } catch {
                    return `Meeting #${meetingIdDisplay}`;
                  }
                })()}
              </h1>
              <div className="pd-sub">ID: {meetingIdDisplay}</div>
            </div>
          </div>
          <div className="pd-right">
            <div className="pd-clock" aria-live="polite">
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="pd-user">
              <div className="pd-avatar">
                {(displayName || user?.username || "User").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="pd-user-name">{displayName || user?.username || "Participant"}</div>
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
            {err && !loading && <div className="pd-error">Gagal memuat menu: {err}</div>}
            {!loading && !err && (
              <div className="pd-grid">
                {visibleMenus.map((m) => {
                  const slug = (m.slug || "").toLowerCase();
                  const val = Number(badgeMap[slug] || 0);
                  return (
                    <button
                      key={m.menuId || m.slug}
                      className="pd-tile"
                      onClick={() => handleTileClick(m)}
                      aria-label={val > 0 ? `${m.label}, ${val} baru` : m.label || m.slug}
                    >
                      <span className="pd-tile-icon" aria-hidden>
                        <Icon slug={m.slug} iconUrl={m.iconUrl} />
                        {val > 0 ? (
                          <span className="pd-badge">{val > 99 ? "99+" : val}</span>
                        ) : m.hasNew ? (
                          <span className="pd-dot" />
                        ) : null}
                      </span>
                      <span className="pd-tile-label">{m.label}</span>
                    </button>
                  );
                })}
                {visibleMenus.length === 0 && (
                  <div className="pd-empty">Tidak ada menu untuk role ini.</div>
                )}
              </div>
            )}
          </section>
        </main>

        <MeetingFooter
          userRole={user?.role || "participant"}
          onLeaveMeeting={() => {
            if (window.confirm("Keluar dari meeting ini?")) {
              localStorage.removeItem("currentMeeting");
              navigate("/start");
            }
          }}
          micOn={micOn}
          camOn={camOn}
          onToggleMic={onToggleMic}
          onToggleCam={onToggleCam}
          onHelpClick={() => alert("Contact support")}
        />
      </div>
    </MeetingLayout>
  );
}
