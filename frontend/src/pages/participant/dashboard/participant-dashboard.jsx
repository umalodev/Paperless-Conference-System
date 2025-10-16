import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
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

export default function ParticipantDashboard() {
  const [user, setUser] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const navigate = useNavigate();
  const { confirm, notify } = useModal();

  const mediaRoom = useMediaRoom?.() || null;

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

  const cleanupRealtime = () => {
    try {
      if (window.simpleScreenShare?.isSharing)
        window.simpleScreenShare.stopScreenShare();
    } catch {}
    try {
      window.meetingWebSocket?.close?.();
    } catch {}
  };

  // Immediate check meeting status when component mounts
  // ============================================================
  // 🔍 Check Meeting Status + Auto Disconnect jika meeting berakhir
  // ============================================================
  const checkMeetingStatusImmediately = async (meetingId) => {
    try {
      console.log(`Immediate check meeting status for meeting ${meetingId}...`);
      const result = await meetingService.checkMeetingStatus(meetingId);
      console.log("Immediate meeting status check result:", result);

      // ✅ Helper untuk disconnect socket & cleanup
      const disconnectAndExit = (reasonMsg) => {
        console.log(`🛑 ${reasonMsg}`);

        // 🔌 Putuskan socket Control Server (jika terhubung)
        try {
          if (window.electronAPI?.disconnectFromControlServer) {
            window.electronAPI.disconnectFromControlServer();
            console.log("🔌 Disconnected from Control Server (meeting ended)");
          }
        } catch (err) {
          console.warn("⚠️ Failed to disconnect socket:", err);
        }

        // 🧹 Bersihkan storage & arahkan ke start
        localStorage.removeItem("currentMeeting");
        alert(reasonMsg);
        navigate("/start");
      };

      // 💀 Meeting sudah berakhir
      if (result?.data?.status === "ended") {
        disconnectAndExit(
          "Meeting telah berakhir. Anda akan dikeluarkan dari meeting."
        );
        return;
      }

      // 🚫 Meeting tidak aktif
      if (!result?.data?.isActive) {
        disconnectAndExit(
          "Meeting tidak aktif. Anda akan dikeluarkan dari meeting."
        );
        return;
      }
    } catch (error) {
      console.error("Error in immediate meeting status check:", error);

      // ❌ Meeting mungkin sudah dihapus (404)
      if (
        error.message.includes("404") ||
        error.message.includes("not found")
      ) {
        console.log("Meeting not found, immediate exit...");

        try {
          if (window.electronAPI?.disconnectFromControlServer) {
            window.electronAPI.disconnectFromControlServer();
            console.log(
              "🔌 Disconnected from Control Server (meeting not found)"
            );
          }
        } catch (err) {
          console.warn("⚠️ Failed to disconnect socket:", err);
        }

        localStorage.removeItem("currentMeeting");
        alert("Meeting tidak ditemukan. Anda akan dikeluarkan dari meeting.");
        navigate("/start");
        return;
      }
    }
  };

// ===============================
// 🔌 Connect to Meeting Socket.IO
// ===============================
useEffect(() => {
  const meetingId = currentMeeting?.meetingId || currentMeeting?.id;
  if (!meetingId || !user) return;

  // ✅ pastikan nama sudah siap
  const nameFromLocal = localStorage.getItem("pconf.displayName");
  if (!nameFromLocal && !displayName) {
    console.log("⏳ Menunggu displayName tersedia sebelum connect...");
    return;
  }

  const latestDisplayName =
    nameFromLocal || displayName || user?.username || "User";

  // ✅ sebelum connect, bersihkan listener lama
  meetingSocketService.off("participant_joined");
  meetingSocketService.off("participant_left");
  meetingSocketService.socket?.off("connect");

  // ⛔ jika sudah connect, skip connect ulang
  if (meetingSocketService.isConnected()) {
    console.log("Socket already connected, skip connect()");
  } else {
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

  // ✅ attach baru
  meetingSocketService.socket?.on("connect", onConnected);
  meetingSocketService.on("participant_joined", handleJoin);
  meetingSocketService.on("participant_left", handleLeft);

  // ✅ bersihkan saat unmount
  return () => {
    meetingSocketService.socket?.off("connect", onConnected);
    meetingSocketService.off("participant_joined", handleJoin);
    meetingSocketService.off("participant_left", handleLeft);
  };
}, [currentMeeting?.id, user?.id, displayName]);



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

  const {
    ready: mediaReady,
    error: mediaError,
    micOn,
    camOn,
    startMic,
    stopMic,
    startCam,
    stopCam,
    muteAllOthers,
  } = useMediaRoom();

  const onToggleMic = useCallback(() => {
    if (!mediaReady) return;
    micOn ? stopMic() : startMic();
  }, [mediaReady, micOn, startMic, stopMic]);

  const onToggleCam = useCallback(() => {
    if (!mediaReady) return;
    camOn ? stopCam() : startCam();
  }, [mediaReady, camOn, startCam, stopCam]);

  const visibleMenus = useMemo(
    () =>
      (menus || [])
        .filter((m) => (m?.flag ?? "Y") === "Y")
        .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999)), // Tambahkan sorting
    [menus]
  );

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
    // --- 0️⃣ Ambil meetingId aktif dari state / context ---
    const meetingId =
      currentMeeting?.meetingId || currentMeeting?.id || currentMeeting?.code;

    // --- 1️⃣ Kirim leave-room & matikan socket meeting ---
    try {
      await meetingSocketService.disconnect(true); // pakai force agar kirim leave-room dulu
      console.log("🔌 Fully cleaned socket before logout");
      await new Promise((r) => setTimeout(r, 400)); // beri waktu agar server sempat broadcast
    } catch (err) {
      console.warn("⚠️ Error disconnecting meeting socket:", err);
    }

    // --- 2️⃣ Matikan device media (mic / cam) ---
    try {
      if (micOn) await stopMic();
    } catch (e) {
      console.warn("⚠️ stopMic error:", e);
    }
    try {
      if (camOn) await stopCam();
    } catch (e) {
      console.warn("⚠️ stopCam error:", e);
    }

    // --- 3️⃣ Cleanup total realtime & screen-share ---
    try {
      await cleanupAllMediaAndRealtime({
        mediaRoom,
      });
    } catch (e) {
      console.warn("⚠️ cleanupAllMediaAndRealtime error:", e);
    }

    // --- 4️⃣ Putuskan koneksi ke Control Server (opsional Electron) ---
    try {
      if (window.electronAPI?.disconnectFromControlServer) {
        window.electronAPI.disconnectFromControlServer();
        console.log("🛑 Disconnected from Control Server via logout");
      }
    } catch (e) {
      console.warn("⚠️ Control server disconnect error:", e);
    }

    // --- 5️⃣ Beri tahu backend kalau masih terdaftar di meeting ---
    try {
      if (meetingId) await meetingService.leaveMeeting(meetingId);
    } catch (e) {
      console.warn("⚠️ leaveMeeting failed:", e);
    }

    // --- 6️⃣ Logout backend jika tersedia ---
    try {
      if (typeof meetingService.logout === "function") {
        await meetingService.logout();
      }
    } catch (e) {
      console.warn("⚠️ meetingService.logout error:", e);
    }

    // --- 8️⃣ Redirect ke halaman awal ---
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
  useEffect(() => {
    console.log("visibleMenus:", visibleMenus);
  }, [visibleMenus]);

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  return (
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
                  return cm?.title || `Meeting #${meetingId}`;
                } catch {
                  return `Meeting #${meetingId}`;
                }
              })()}
            </h1>
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
                  key={m.menuId || m.slug}
                  className="pd-tile"
                  onClick={() => handleTileClick(m)}
                  aria-label={m.label || m.slug}
                >
                  <span className="pd-tile-icon" aria-hidden>
                    <Icon slug={m.slug} iconUrl={m.iconUrl} />
                  </span>
                  <span className="pd-tile-label">{m.label}</span>
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
        micOn={micOn}
        camOn={camOn}
        onToggleMic={onToggleMic}
        onToggleCam={onToggleCam}
        onHelpClick={() => alert("Contact support")}
      />
    </div>
  );
}
