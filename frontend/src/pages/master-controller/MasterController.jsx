import React, { useEffect, useState, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import { CONTROL_URL, API_URL } from "../../config";
import MeetingLayout from "../../components/MeetingLayout.jsx";
import MeetingFooter from "../../components/MeetingFooter.jsx";
import BottomNav from "../../components/BottomNav.jsx";
import meetingService from "../../services/meetingService.js";
import "./master-controller.css";

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


  // =====================================================
  // LOAD USER + MENUS (sama seperti Services.jsx)
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
  //  SOCKET.IO SETUP
  // =====================================================
  useEffect(() => {
    const s = io(CONTROL_URL, { transports: ["websocket"] });

    s.on("connect", () => console.log(" Connected to Control Server"));
    s.on("disconnect", () => console.log(" Disconnected from Control Server"));

    // Update participant list
    s.on("participants", (data) => setParticipants(data || []));

    //  Listen for mirror frames
    s.on("mirror-frame", ({ from, frame }) => {
      console.log(" Received mirror frame from", from, "size:", frame.length);
      setMirrorFrames((prev) => ({
        ...prev,
        [from]: frame,
      }));
    });

    //  Clear frame when mirror stopped
    s.on("mirror-stop", ({ from }) => {
      console.log(" Mirror stopped for", from);
      setMirrorFrames((prev) => {
        const copy = { ...prev };
        delete copy[from];
        return copy;
      });
    });


    setSocket(s);
    return () => s.disconnect();
  }, []);



  // =====================================================
  //  FETCH PARTICIPANTS MANUAL
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
  //  COMMAND HANDLER
  // =====================================================
  const sendCommand = async (targetId, action) => {
  try {
    // 🚀 Jika user klik STOP, langsung hapus mirror lokal
    if (action === "mirror-stop") {
      setMirrorFrames((prev) => {
        const copy = { ...prev };
        delete copy[targetId];
        return copy;
      });
    }

    const res = await fetch(`${CONTROL_URL}/api/control/command/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(`${data.message || "Command executed successfully"}`);
  } catch (err) {
    console.error(`Failed to send '${action}':`, err);
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
                <img
                  src="/img/refresh.png"
                  alt="Refresh"
                  className="action-icon"
                />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        <main className="pd-main">
          {loading ? (
            <div className="pd-empty">Loading participants...</div>
          ) : err ? (
            <div className="pd-empty text-red-500">Error: {err}</div>
          ) : participants.length === 0 ? (
            <div className="pd-empty">No participants connected.</div>
          ) : (
            <div className="mc-pc-grid">
              {participants.map((p) => (
                <div key={p.id} className="mc-pc-card">
                  {/* === Toolbar atas === */}
                  <div className="mc-pc-header">
                    <div className="mc-pc-info">
                      <strong>{p.hostname || "Unknown"}</strong>
                      <span className="mc-pc-os">({p.os})</span>
                    </div>
                    <div className="mc-pc-user">
                      {p.account ? (
                        <>
                          👤 {p.account.username} <span>({p.account.role})</span>
                        </>
                      ) : (
                        <span className="text-red-500 italic">Not authenticated</span>
                      )}
                    </div>
                  </div>

                  {/* === Mirror layar besar === */}
                  <div className="mc-pc-screen" onClick={() => setFullscreenId(p.id)}>
                    {mirrorFrames[p.id] ? (
                      <img
                        src={`data:image/jpeg;base64,${mirrorFrames[p.id]}`}
                        alt="Screen mirror"
                        className="mc-pc-img"
                        title="Click to view fullscreen"
                      />
                    ) : (
                      <div className="mc-pc-no-screen">
                        <div className="no-screen-icon">
                          <img src="/img/screen.png" alt="No mirror" />
                        </div>
                        <div className="no-screen-text">
                          <h3>No Mirror Active</h3>
                          <p>
                            Click{" "}
                            <img
                              src="/img/expand.png"
                              alt="Start Mirror"
                              className="mc-icon-inline"
                            />{" "}
                            to start screen mirroring
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* === Tombol kontrol bawah (ikon saja) === */}
                  <div className="mc-pc-actions">
                    {/* Tombol Mirror dinamis */}
                    {mirrorFrames[p.id] ? (
                      <button
                        className="mc-icon-btn mc-btn--red"
                        onClick={() => sendCommand(p.id, "mirror-stop")}
                        title="Stop Mirror"
                      >
                        <img
                          src="/img/cross.png"
                          alt="Stop Mirror"
                          className="mc-icon-img"
                        />
                      </button>
                    ) : (
                      <button
                        className="mc-icon-btn mc-btn--blue"
                        onClick={() => sendCommand(p.id, "mirror-start")}
                        title="Start Mirror"
                      >
                        <img
                          src="/img/expand.png"
                          alt="Start Mirror"
                          className="mc-icon-img"
                        />
                      </button>
                    )}

                    {/* Tombol lainnya */}
                    <button
                      className="mc-icon-btn mc-btn--yellow"
                      onClick={() => sendCommand(p.id, "restart")}
                      title="Restart PC"
                    >
                      <img src="/img/refresh.png" alt="Restart" className="mc-icon-img" />
                    </button>

                    <button
                      className="mc-icon-btn mc-btn--gray"
                      onClick={() => sendCommand(p.id, "shutdown")}
                      title="Shutdown PC"
                    >
                      <img src="/img/power.png" alt="Shutdown" className="mc-icon-img" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </main>


        {fullscreenId && mirrorFrames[fullscreenId] && (
          <div className="mc-fullscreen-overlay" onClick={() => setFullscreenId(null)}>
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
              <img
                src={`data:image/jpeg;base64,${mirrorFrames[fullscreenId]}`}
                alt="Fullscreen mirror"
                className="mc-fullscreen-img"
              />
            </div>
          </div>
        )}


        {!loadingMenus && !errMenus && (
          <BottomNav
            items={visibleMenus}
            active="master-controller"
            onSelect={(item) => (window.location.href = `/menu/${item.slug}`)}
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
