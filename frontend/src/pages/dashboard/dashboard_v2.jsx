import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./dashboard_v2.css";

export default function DashboardUser() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [user, setUser] = useState(null);
  const [elapsed, setElapsed] = useState(0); // seconds since waiting

  // Ambil user & meeting dari storage/route state
  const meeting = useMemo(() => {
    const fromState = state?.meeting;
    if (fromState) return fromState;
    try {
      const saved = localStorage.getItem("currentMeeting");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, [state]);

  useEffect(() => {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) {
      navigate("/", { replace: true });
      return;
    }
    try {
      setUser(JSON.parse(userRaw));
    } catch {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // Timer sederhana (count up)
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatMMSS = (sec) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(1, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m} : ${s}`;
  };

  const handleLeave = () => {
    // User hanya keluar dari ruang tunggu (tetap login)
    navigate("/start", { replace: true });
  };

  if (!user) return null;

  // Dummy peserta lain (bisa ganti dari API)
  const others = [
    { id: "p1", name: "Alice Johnson" },
    { id: "p2", name: "Bob Smith" },
    { id: "p3", name: "Carol Wilson" },
  ];
  const waitingCount = others.length;

  return (
    <div className="ud-root">
      {/* Top bar */}
      <header className="ud-topbar">
        <div className="ud-brand">
          <img src="/img/logo.png" alt="Umalo" className="ud-logo" />
          <div className="ud-title">
            <div className="ud-title-row">
              <img src="/img/pc.png" alt="" className="ud-monitor-icon" />
              <span className="ud-brand-text">User Dashboard</span>
            </div>
            <span className="ud-subwelcome">Hello {user?.username}</span>
          </div>
        </div>

        <button onClick={handleLeave} className="ud-leave" type="button">
          <span className="ud-leave-icon">↪</span>
          Logout
        </button>
      </header>

      {/* Grid: Meeting info + Waiting time */}
      <section className="ud-grid">
        <div className="ud-card ud-card--soft">
          <div className="ud-card-head">
            <span className="ud-card-ico" aria-hidden>
              👥
            </span>
            <h3 className="ud-card-title">Meeting Information</h3>
          </div>

          <div className="ud-kv">
            <div className="ud-kv-row">
              <span className="ud-kv-key">Meeting ID :</span>
              <span className="ud-kv-val">{meeting?.id || "—"}</span>
            </div>
            <div className="ud-kv-row">
              <span className="ud-kv-key">Status :</span>
              <span className="ud-kv-val">
                <span className="ud-badge ud-badge--warn">
                  waiting for host
                </span>
              </span>
            </div>
            <div className="ud-kv-row">
              <span className="ud-kv-key">Participants :</span>
              <span className="ud-kv-val">{waitingCount} waiting</span>
            </div>
          </div>
        </div>

        <div className="ud-card ud-card--soft">
          <div className="ud-card-head">
            <span className="ud-card-ico" aria-hidden>
              🕒
            </span>
            <h3 className="ud-card-title">Waiting Time</h3>
          </div>

          <div className="ud-waittime">
            <div className="ud-waittime-clock">{formatMMSS(elapsed)}</div>
            <div className="ud-waittime-sub">
              Waiting for the host to start the meeting
            </div>
          </div>
        </div>
      </section>

      {/* Waiting banner */}
      <section className="ud-banner">
        <div className="ud-spinner" aria-hidden>
          <span></span>
          <span></span>
          <span></span>
        </div>
        <h3 className="ud-banner-title">Waiting for the meeting to start</h3>
        <p className="ud-banner-desc">
          The host hasn’t started the meeting yet. You’ll be automatically
          connected when the meeting begins.
        </p>
      </section>

      {/* Other participants */}
      <section className="ud-others">
        <h3 className="ud-others-title">Other Participants</h3>
        <p className="ud-others-sub">People waiting to join this meeting</p>

        <ul className="ud-people">
          {others.map((p) => (
            <li key={p.id} className="ud-person">
              <div className="ud-person-left">
                <div className="ud-avatar" aria-hidden>
                  👤
                </div>
                <span className="ud-person-name">{p.name}</span>
              </div>
              <span className="ud-badge ud-badge--ok">waiting</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
