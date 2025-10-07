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

  // =====================================================
  // 🧩 LOAD USER + MENUS (sama seperti Services.jsx)
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
  // ⚙️ SOCKET.IO SETUP
  // =====================================================
  useEffect(() => {
    const s = io(CONTROL_URL, { transports: ["websocket"] });
    s.on("connect", () => console.log("✅ Connected to Control Server"));
    s.on("disconnect", () => console.log("❌ Disconnected from Control Server"));
    s.on("participants", (data) => setParticipants(data || []));
    setSocket(s);
    return () => s.disconnect();
  }, []);

  // =====================================================
  // 🔁 FETCH PARTICIPANTS MANUAL
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
  // 🧠 COMMAND HANDLER
  // =====================================================
  const sendCommand = async (targetId, action) => {
    try {
      const res = await fetch(`${CONTROL_URL}/api/control/command/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      alert(`✅ ${data.message || "Command executed successfully"}`);
    } catch (err) {
      console.error(`❌ Failed to send '${action}':`, err);
      alert(`❌ Failed to send '${action}'`);
    }
  };

  // =====================================================
  // 🎨 UI SECTION
  // =====================================================
  return (
    <MeetingLayout
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
              className="pd-btn"
              onClick={fetchParticipants}
              disabled={loading}
            >
              🔄 Refresh
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
            <div className="mc-grid">
              {participants.map((p) => (
                <div key={p.id} className="mc-card">
                  <h2 className="mc-title">
                    {p.hostname || "Unknown"}{" "}
                    <span className="mc-os">({p.os})</span>
                  </h2>
                  <p className="mc-user">{p.user || "No user"}</p>

                  {p.account ? (
                    <div className="mc-account">
                      <strong>User:</strong> {p.account.username} <br />
                      <strong>Role:</strong> {p.account.role}
                    </div>
                  ) : (
                    <div className="mc-account mc-account--warn">
                      <em>Not authenticated</em>
                    </div>
                  )}

                  <div className="mc-actions">
                    <button
                      className="mc-btn mc-btn--blue"
                      onClick={() => sendCommand(p.id, "mirror-start")}
                    >
                      Mirror
                    </button>
                    <button
                      className="mc-btn mc-btn--gray"
                      onClick={() => sendCommand(p.id, "mirror-stop")}
                    >
                      Stop
                    </button>
                    <button
                      className="mc-btn mc-btn--yellow"
                      onClick={() => sendCommand(p.id, "restart")}
                    >
                      Restart
                    </button>
                    <button
                      className="mc-btn mc-btn--red"
                      onClick={() => sendCommand(p.id, "shutdown")}
                    >
                      Shutdown
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

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
