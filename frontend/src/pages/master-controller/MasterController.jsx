import React, { useEffect, useState, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import { CONTROL_URL, API_URL } from "../../config";
import MeetingLayout from "../../components/MeetingLayout.jsx";
import MeetingFooter from "../../components/MeetingFooter.jsx";
import BottomNav from "../../components/BottomNav.jsx";
import meetingService from "../../services/meetingService.js";
import { useNavigate } from "react-router-dom"; // ⬅️ di atas file
import "./master-controller.css";
import { useModal } from "../../contexts/ModalProvider.jsx";


export default function MasterController() {
  const [user, setUser] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");
  const [mirrorFrames, setMirrorFrames] = useState({});
  const [fullscreenId, setFullscreenId] = useState(null);
  const navigate = useNavigate();
  const [selectedInfo, setSelectedInfo] = useState(null);
  const { confirm, notify } = useModal();


  // =====================================================
  // LOAD USER + MENUS
  // =====================================================
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}

    let cancel = false;
    (async () => {
      try {
        setLoadingMenus(true);
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
              seq: m.sequenceMenu,
            }))
          : [];
        if (!cancel) setMenus(list);
      } catch (e) {
        if (!cancel) setErrMenus(String(e.message || e));
      } finally {
        if (!cancel) setLoadingMenus(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, []);

  const visibleMenus = useMemo(
    () =>
      (menus || [])
        .filter((m) => (m?.flag ?? "Y") === "Y")
        .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999)),
    [menus]
  );

  // =====================================================
  // SOCKET.IO SETUP
  // =====================================================
  useEffect(() => {
    const s = io(CONTROL_URL, { transports: ["websocket"] });

    s.on("connect", () => console.log("🟢 Connected to Control Server"));
    s.on("disconnect", () => console.log("🔴 Disconnected from Control Server"));

    // 🧩 Update participant list
    s.on("participants", (data) => setParticipants(data || []));

    // 🪞 Mirror frames
    s.on("mirror-frame", ({ from, frame }) => {
      setMirrorFrames((prev) => ({ ...prev, [from]: frame }));
    });

    // 🛑 Mirror stop
    s.on("mirror-stop", ({ from }) => {
      setMirrorFrames((prev) => {
        const copy = { ...prev };
        delete copy[from];
        return copy;
      });
    });

    // 🔒 Update lock/unlock status realtime
    s.on("participant-lock", ({ id, isLocked }) => {
      console.log("🔒 participant-lock:", id, isLocked);
      setParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isLocked } : p))
      );
    });

    setSocket(s);
    return () => s.disconnect();
  }, []);

  // =====================================================
  // FETCH PARTICIPANTS (MANUAL)
  // =====================================================
  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${CONTROL_URL}/api/control/participants`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setParticipants(data.participants || []);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

// =====================================================
// COMMAND HANDLER (PASTI HANYA KONFIRMASI UNTUK RESTART/SHUTDOWN)
// =====================================================
const sendCommand = async (targetId, action) => {
  try {
    // ====== Tentukan apakah butuh konfirmasi ======
    const needsConfirm = ["restart", "shutdown", "lock", "unlock"].includes(action);

    // Kalau tidak butuh konfirmasi (misal mirror-start/stop, info, dll)
    if (!needsConfirm) {
      await executeCommand(targetId, action);
      return;
    }

    // ====== Konfigurasi pesan modal ======
    let title = "";
    let message = "";
    let okText = "";
    let destructive = false;

    switch (action) {
      case "lock":
        title = "Kunci perangkat ini?";
        message = "User tidak akan bisa mengoperasikan perangkat selama terkunci.";
        okText = "Kunci";
        destructive = false;
        break;
      case "unlock":
        title = "Buka kunci perangkat ini?";
        message = "User akan dapat kembali menggunakan perangkatnya.";
        okText = "Buka Kunci";
        destructive = false;
        break;
      case "restart":
        title = "Restart perangkat ini?";
        message = "Perangkat akan dimulai ulang dan mungkin terputus sementara.";
        okText = "Restart";
        destructive = true;
        break;
      case "shutdown":
        title = "Matikan perangkat ini?";
        message = "Perangkat akan dimatikan dan terputus dari server.";
        okText = "Matikan";
        destructive = true;
        break;
    }

    // ====== Tampilkan modal konfirmasi ======
    const ok = await confirm({
      title,
      message,
      destructive,
      okText,
      cancelText: "Batal",
      onConfirm: async () => {
        await executeCommand(targetId, action);
      },
    });

    if (!ok) return;
  } catch (err) {
    console.error(`❌ Gagal '${action}':`, err);
    await notify({
      variant: "error",
      title: "Gagal Mengirim Perintah",
      message: err.message || "Terjadi kesalahan saat mengirim perintah.",
      autoCloseMs: 2000,
    });
  }
};


// =====================================================
// EKSEKUSI COMMAND KE BACKEND
// =====================================================
const executeCommand = async (targetId, action) => {
  try {
    // 🧩 Optimistic UI
    if (action === "mirror-stop") {
      setMirrorFrames((prev) => {
        const copy = { ...prev };
        delete copy[targetId];
        return copy;
      });
    }

    if (action === "lock") {
      setParticipants((prev) =>
        prev.map((p) => (p.id === targetId ? { ...p, isLocked: true } : p))
      );
    }

    if (action === "unlock") {
      setParticipants((prev) =>
        prev.map((p) => (p.id === targetId ? { ...p, isLocked: false } : p))
      );
    }

    // 🚀 Kirim command ke backend
    const res = await fetch(`${CONTROL_URL}/api/control/command/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // ✅ Notifikasi sukses
    await notify({
      variant: "success",
      title:
        action === "shutdown"
          ? "Perintah Shutdown dikirim"
          : action === "restart"
          ? "Perintah Restart dikirim"
          : "Perintah berhasil",
      message: data.message || `Perintah ${action} berhasil dikirim.`,
      autoCloseMs: 1500,
    });

    console.log(`✅ ${data.message || "Command executed successfully"}`);
  } catch (err) {
    console.error(`❌ Failed to send '${action}':`, err);
    await notify({
      variant: "error",
      title: "Gagal Mengirim Perintah",
      message: err.message || "Terjadi kesalahan saat mengirim command.",
      autoCloseMs: 2000,
    });
  }
};

  // =====================================================
  // UI SECTION
  // =====================================================
  return (
    <MeetingLayout
      disableMeetingSocket={true}
      meetingId={1000}
      userId={user?.id || user?.userId || null}
      userRole={user?.role || "admin"}
    >
      <div className="pd-app">
        {/* === Header === */}
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <div>
              <h1 className="pd-title">Master Controller</h1>
              <div className="pd-sub">
                Manage and control connected participant devices
              </div>
            </div>
          </div>
          <div className="pd-right">
            <button
              className="note-btn ghost"
              onClick={() => window.location.reload()}
              title="Refresh"
              aria-label="Refresh"
            >
              <img src="/img/refresh.png" alt="Refresh" className="action-icon" />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* === Main Content === */}
        <main className="pd-main">
        {loading ? (
          <div className="pd-empty">Loading participants...</div>
        ) : err ? (
          <div className="pd-empty text-red-500">Error: {err}</div>
        ) : participants.length === 0 ? (
          <div className="pd-empty">No participants connected.</div>
        ) : (
          <div className="mc-monitor-grid">
            {participants.map((p) => (
              <div
                key={p.id}
                className={`mc-monitor-item ${p.isLocked ? "locked" : ""}`}
              >
                {/* === Tampilan layar === */}
                <div
                  className="mc-monitor-screen"
                  onDoubleClick={() => setFullscreenId(p.id)} // double-click untuk fullscreen
                >
                  {mirrorFrames[p.id] ? (
                    <img
                      src={`data:image/jpeg;base64,${mirrorFrames[p.id]}`}
                      alt="Screen mirror"
                      className="mc-monitor-img"
                      title="Double-click to view fullscreen"
                    />
                  ) : (
                    <div className="mc-monitor-placeholder">
                      <img src="/img/display-slash.png" alt="No mirror" />
                      <p>No mirror active</p>
                    </div>
                  )}
                </div>

                {/* === Info user di bawah layar === */}
                <div className="mc-monitor-info">
                  <strong>
                    {p.account?.displayName || p.account?.username || "Unknown"}
                  </strong>
                  <small className="mc-role">
                    ({p.account?.role || "participant"})
                  </small>
                </div>

                {/* === Tombol aksi (icon only) === */}
                <div className="mc-monitor-actions icons-only">
                  <button
                    className="icon-btn green"
                    onClick={() => setSelectedInfo(p)}
                    title="View Info"
                  >
                    <img src="/img/info.png" alt="Info" />
                  </button>

                  {mirrorFrames[p.id] ? (
                    <button
                      className="icon-btn red"
                      onClick={() => sendCommand(p.id, "mirror-stop")}
                      title="Stop Mirror"
                    >
                      <img src="/img/cross.png" alt="Stop Mirror" />
                    </button>
                  ) : (
                    <button
                      className="icon-btn blue"
                      onClick={() => sendCommand(p.id, "mirror-start")}
                      title="Start Mirror"
                    >
                      <img src="/img/eye.png" alt="Start Mirror" />
                    </button>
                  )}

                  {p.isLocked ? (
                    <button
                      className="icon-btn gray"
                      onClick={() => sendCommand(p.id, "unlock")}
                      title="Unlock"
                    >
                      <img src="/img/unlock.png" alt="Unlock" />
                    </button>
                  ) : (
                    <button
                      className="icon-btn gray"
                      onClick={() => sendCommand(p.id, "lock")}
                      title="Lock"
                    >
                      <img src="/img/lock.png" alt="Lock" />
                    </button>
                  )}

                  <button
                    className="icon-btn yellow"
                    onClick={() => sendCommand(p.id, "restart")}
                    title="Restart"
                  >
                    <img src="/img/refresh.png" alt="Restart" />
                  </button>

                  <button
                    className="icon-btn dark"
                    onClick={() => sendCommand(p.id, "shutdown")}
                    title="Shutdown"
                  >
                    <img src="/img/power.png" alt="Shutdown" />
                  </button>                  
                </div>
              </div>
            ))}
          </div>
        )}
      </main>



        {/* === Fullscreen Mirror === */}
        {fullscreenId && mirrorFrames[fullscreenId] && (() => {
          const p = participants.find((x) => x.id === fullscreenId);
          return (
            <div
              className="mc-fullscreen-overlay"
              onClick={() => setFullscreenId(null)}
            >
              <div className="mc-fullscreen-container">
                <button
                  className="mc-fullscreen-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullscreenId(null);
                  }}
                  title="Close fullscreen"
                >
                  ✖
                </button>

                {/* Layar mirror */}
                <img
                  src={`data:image/jpeg;base64,${mirrorFrames[fullscreenId]}`}
                  alt="Fullscreen mirror"
                  className="mc-fullscreen-img"
                />

                {/* === Info Pemilik Layar === */}
                {p && (
                  <div className="mc-fullscreen-info">
                    <h2>{p.hostname || "Unknown Device"}</h2>
                      <p>
                        👤 {p.account?.displayName || p.account?.username || "No User"}{" "}
                        {p.account?.role ? `(${p.account.role})` : ""}
                      </p>
                    <small>OS: {p.os || "N/A"}</small>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* === Modal Info Participant === */}
        {selectedInfo && (
        <div
          className="info-overlay"
          onClick={() => setSelectedInfo(null)}
        >
          <div
            className="info-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Participant Devices Info</h3>

            <table className="info-table">
              <tbody>
                <tr>
                  <th>ID</th>
                  <td>{selectedInfo.id}</td>
                </tr>
                <tr>
                  <th>Hostname</th>
                  <td>{selectedInfo.hostname}</td>
                </tr>
                <tr>
                  <th>User</th>
                  <td>{selectedInfo.user}</td>
                </tr>
                <tr>
                  <th>OS</th>
                  <td>{selectedInfo.os}</td>
                </tr>
                <tr>
                  <th>Account ID</th>
                  <td>{selectedInfo.account?.id}</td>
                </tr>
                <tr>
                  <th>Username</th>
                  <td>{selectedInfo.account?.username}</td>
                </tr>
                <tr>
                  <th>Display Name</th>
                  <td>{selectedInfo.account?.displayName}</td>
                </tr>
                <tr>
                  <th>Role</th>
                  <td>{selectedInfo.account?.role}</td>
                </tr>
                <tr>
                  <th>Created At</th>
                  <td>{new Date(selectedInfo.account?.created_at).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div className="info-footer">
              <button
                className="mc-btn gray"
                onClick={() => setSelectedInfo(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}



        {!loadingMenus && !errMenus && (
          <BottomNav
            items={visibleMenus}
            active="master-controller"
            onSelect={(item) => navigate(`/menu/${item.slug}`)} // ⬅️ tanpa reload
          />
        )}

        <MeetingFooter
          userRole={user?.role || "admin"}
          micOn={false}
          camOn={false}
          onToggleMic={() => {}}
          onToggleCam={() => {}}
        />
      </div>
    </MeetingLayout>
  );
}
