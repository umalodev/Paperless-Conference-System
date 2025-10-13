import React, { useEffect, useState, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import { CONTROL_URL, API_URL } from "../../config";
import MeetingLayout from "../../components/MeetingLayout.jsx";
import MeetingFooter from "../../components/MeetingFooter.jsx";
import BottomNav from "../../components/BottomNav.jsx";
import meetingService from "../../services/meetingService.js";
import { useNavigate } from "react-router-dom";
import "./master-controller.css";
import { useModal } from "../../contexts/ModalProvider.jsx";
import Icon from "../../components/Icon.jsx";

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
  const [query, setQuery] = useState("");
  const [hoveredId, setHoveredId] = useState(null);
  const [stats, setStats] = useState({ fps: 0 });
  const [latency, setLatency] = useState(null);

  // =====================================================
  // FILTER PARTICIPANTS
  // =====================================================
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const role = (p.account?.role || "").toLowerCase();
      const displayName = (p.account?.displayName || "").toLowerCase();
      const searchTerm = query.toLowerCase();
      return !query || displayName.includes(searchTerm) || role.includes(searchTerm);
    });
  }, [participants, query]);

  // =====================================================
  // FPS COUNTER
  // =====================================================
  useEffect(() => {
    let frames = 0;
    const timer = setInterval(() => {
      setStats({ fps: frames });
      frames = 0;
    }, 1000);

    socket?.on("mirror-frame", () => frames++);
    return () => clearInterval(timer);
  }, [socket]);

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
  // COMMAND HANDLER
  // =====================================================
  const sendCommand = async (targetId, action) => {
    try {
      const needsConfirm = ["restart", "shutdown", "lock", "unlock"].includes(action);

      if (!needsConfirm) {
        await executeCommand(targetId, action);
        return;
      }

      let title = "";
      let message = "";
      let okText = "";
      let destructive = false;

      switch (action) {
        case "lock":
          title = "Kunci perangkat ini?";
          message = "User tidak akan bisa mengoperasikan perangkat selama terkunci.";
          okText = "Kunci";
          break;
        case "unlock":
          title = "Buka kunci perangkat ini?";
          message = "User akan dapat kembali menggunakan perangkatnya.";
          okText = "Buka Kunci";
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

      const ok = await confirm({
        title,
        message,
        destructive,
        okText,
        cancelText: "Batal",
        onConfirm: async () => await executeCommand(targetId, action),
      });
      if (!ok) return;
    } catch (err) {
      console.error(`❌ Gagal '${action}':`, err);
      await notify({
        variant: "error",
        title: "Gagal Mengirim Perintah",
        message: err.message || "Terjadi kesalahan saat mengirim perintah.",
      });
    }
  };

  // =====================================================
  // EXECUTE COMMAND
  // =====================================================
  const executeCommand = async (targetId, action) => {
    try {
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

      const res = await fetch(`${CONTROL_URL}/api/control/command/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      await notify({
        variant: "success",
        title:
          action === "shutdown"
            ? "Perintah Shutdown dikirim"
            : action === "restart"
            ? "Perintah Restart dikirim"
            : "Perintah berhasil",
        message: data.message || `Perintah ${action} berhasil dikirim.`,
      });
    } catch (err) {
      console.error(`❌ Failed to send '${action}':`, err);
      await notify({
        variant: "error",
        title: "Gagal Mengirim Perintah",
        message: err.message || "Terjadi kesalahan saat mengirim command.",
      });
    }
  };

  // =====================================================
  // LATENCY MONITOR
  // =====================================================
  useEffect(() => {
    if (!socket) return;
    const interval = setInterval(() => {
      const ts = Date.now();
      socket.emit("ping-check", { ts });
    }, 3000);

    socket.on("pong-check", ({ ts }) => {
      const diff = Date.now() - ts;
      setLatency(diff);
    });

    return () => {
      clearInterval(interval);
      socket.off("pong-check");
    };
  }, [socket]);

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
            <div className="network-status">
              {latency === null ? (
                <span className="net-badge gray">--</span>
              ) : latency < 100 ? (
                <span className="net-badge green">{latency} ms</span>
              ) : latency < 300 ? (
                <span className="net-badge yellow">{latency} ms</span>
              ) : (
                <span className="net-badge red">{latency} ms</span>
              )}
            </div>
            <button
              className="note-btn ghost"
              onClick={() => fetchParticipants()}
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
              {/* === Search Bar === */}
              <div className="mc-monitor-header">
                <div className="prt-search">
                  <span className="prt-search-icon">
                    <Icon slug="search" />
                  </span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name or role…"
                  />
                </div>
                <div className="mc-count">
                  Showing {filteredParticipants.length} of {participants.length}
                </div>
              </div>

              {/* === Monitor Items === */}
              {filteredParticipants.map((p) => (
                <div
                  key={p.id}
                  className={`mc-monitor-item ${p.isLocked ? "locked" : ""}`}
                >
                  <div
                    className="mc-monitor-screen"
                    onMouseEnter={() => setHoveredId(p.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onDoubleClick={() => setFullscreenId(p.id)}
                  >
                    {mirrorFrames[p.id] ? (
                      <div className="mc-monitor-frame">
                        <canvas
                          ref={(ref) => {
                            if (!ref) return;
                            const ctx = ref.getContext("2d");
                            const img = new Image();
                            img.src = `data:image/jpeg;base64,${mirrorFrames[p.id]}`;
                            img.onload = () => {
                              ctx.clearRect(0, 0, ref.width, ref.height);
                              ctx.drawImage(img, 0, 0, ref.width, ref.height);
                            };
                          }}
                          width={320}
                          height={180}
                          className="mc-monitor-canvas"
                        />
                        <div className="mc-fps-overlay">{stats.fps} FPS</div>
                        {hoveredId === p.id && (
                          <div className="mc-click-hint">
                            <span>Double click to fullscreen</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mc-monitor-placeholder">
                        <img src="/img/display-slash.png" alt="No mirror" />
                        <p>No mirror active</p>
                      </div>
                    )}
                  </div>

                  <div className="mc-monitor-info">
                    <strong>{p.account?.displayName || p.account?.username || "Unknown"}</strong>
                    <small className="mc-role">
                      ({p.account?.role || "participant"})
                    </small>
                  </div>

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

        {/* === FULLSCREEN MIRROR === */}
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
                <canvas
                  ref={(ref) => {
                    if (!ref) return;
                    const ctx = ref.getContext("2d");
                    const img = new Image();
                    img.src = `data:image/jpeg;base64,${mirrorFrames[fullscreenId]}`;
                    img.onload = () => {
                      ctx.clearRect(0, 0, ref.width, ref.height);
                      ctx.drawImage(img, 0, 0, ref.width, ref.height);
                    };
                  }}
                  width={1280}
                  height={720}
                  className="mc-fullscreen-canvas"
                />
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

        {/* === MODAL INFO PARTICIPANT === */}
        {selectedInfo && (
          <div className="info-overlay" onClick={() => setSelectedInfo(null)}>
            <div className="info-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Participant Device Info</h3>
              <table className="info-table">
                <tbody>
                  <tr><th>ID</th><td>{selectedInfo.id}</td></tr>
                  <tr><th>Hostname</th><td>{selectedInfo.hostname}</td></tr>
                  <tr><th>User</th><td>{selectedInfo.user}</td></tr>
                  <tr><th>OS</th><td>{selectedInfo.os}</td></tr>
                  <tr><th>Account ID</th><td>{selectedInfo.account?.id}</td></tr>
                  <tr><th>Username</th><td>{selectedInfo.account?.username}</td></tr>
                  <tr><th>Display Name</th><td>{selectedInfo.account?.displayName}</td></tr>
                  <tr><th>Role</th><td>{selectedInfo.account?.role}</td></tr>
                </tbody>
              </table>
              <div className="info-footer">
                <button className="mc-btn gray" onClick={() => setSelectedInfo(null)}>
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
            onSelect={(item) => navigate(`/menu/${item.slug}`)}
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
