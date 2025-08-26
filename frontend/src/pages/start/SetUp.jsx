import React, { useEffect, useMemo, useState } from "react";
import "./SetUp.css";
import { useNavigate } from "react-router-dom";
import meetingService from "../../services/meetingService.js";

export default function SetUp() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [recent, setRecent] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {}
    }
    setDisplayName(localStorage.getItem("pconf.displayName") || "");
  }, []);

  const hostName = useMemo(
    () => displayName || user?.username || user?.name || "Host",
    [displayName, user]
  );

  // Load recently meetings (scheduled/last started)
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setErr("");
        setLoadingRecent(true);
        // pakai service kalau ada, fallback ke getActiveMeetings
        const res =
          (meetingService.getRecentMeetings &&
            (await meetingService.getRecentMeetings())) ||
          (await meetingService.getActiveMeetings());

        const arr = Array.isArray(res?.data) ? res.data : [];
        // normalisasi shape
        const list = arr.map((m) => ({
          meetingId: m.meetingId || m.id || String(Math.random()),
          title: m.title || "Untitled Meeting",
          status: (m.status || "scheduled").toLowerCase(), // scheduled | started | ended
          startTime: m.startTime || m.start_time || m.scheduledAt || null,
          participants: m.participants || 0,
        }));
        if (!cancel) setRecent(list);
      } catch (e) {
        if (!cancel) setErr(String(e.message || e));
      } finally {
        if (!cancel) setLoadingRecent(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const goSchedule = () => navigate("/schedule"); // stub route
  const goHistory = () => navigate("/history"); // stub route

  const toLocalDT = (iso) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      const date = d.toLocaleDateString([], {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const time = d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${date} ${time}`;
    } catch {
      return "—";
    }
  };

  // Quick Start
  const quickStart = async () => {
    setCreating(true);
    setErr("");
    try {
      const body = {
        title: `Quick Start by ${hostName}`,
        description: "Instant conference",
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      };
      const result = await meetingService.createMeeting(body);
      if (!result?.success)
        throw new Error(result?.message || "Failed to create meeting");

      const info = {
        id: result.data.meetingId,
        code: result.data.meetingId,
        title: result.data.title || body.title,
        status: result.data.status || "waiting",
      };
      localStorage.setItem("currentMeeting", JSON.stringify(info));
      navigate("/waiting");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setCreating(false);
    }
  };

  // Start button di Recently Meeting
  const handleStartMeeting = async (m) => {
    setErr("");
    try {
      // kalau ada endpoint khusus start:
      if (meetingService.startMeeting) {
        const res = await meetingService.startMeeting(m.meetingId);
        if (!res?.success)
          throw new Error(res?.message || "Failed to start meeting");
      }
      localStorage.setItem(
        "currentMeeting",
        JSON.stringify({
          id: m.meetingId,
          code: m.meetingId,
          title: m.title,
          status: "started",
        })
      );
      navigate("/waiting");
    } catch (e) {
      setErr(String(e.message || e));
    }
  };

  return (
    <div className="hd-app">
      <header className="hd-top">
        <div className="hd-brand">
          <img src="/img/logo.png" alt="Logo" className="hd-logo" />
          <div>
            <h1 className="hd-title">Host Dashboard</h1>
            <div className="hd-sub">welcome back, {hostName}</div>
          </div>
        </div>
        <button className="hd-logout" onClick={() => navigate("/")}>
          <span className="hd-logout-ic">↦</span> Logout
        </button>
      </header>

      <main className="hd-main">
        {/* top cards */}
        <section className="hd-cards">
          <div className="hd-card">
            <div className="hd-card-head">
              <span className="hd-card-ic">▶</span>
              <div>
                <div className="hd-card-title">Quick Start</div>
                <div className="hd-card-sub">
                  Start an instant meeting right now
                </div>
              </div>
            </div>
            <button
              className="hd-btn hd-primary"
              onClick={quickStart}
              disabled={creating}
            >
              {creating ? "Starting…" : "Start Meeting"}
            </button>
          </div>

          <div className="hd-card">
            <div className="hd-card-head">
              <span className="hd-card-ic">⚙</span>
              <div>
                <div className="hd-card-title">Schedule Meeting</div>
                <div className="hd-card-sub">Plan a meeting for later</div>
              </div>
            </div>
            <button className="hd-btn hd-outline" onClick={goSchedule}>
              Schedule
            </button>
          </div>

          <div className="hd-card">
            <div className="hd-card-head">
              <span className="hd-card-ic">👥</span>
              <div>
                <div className="hd-card-title">Meeting History</div>
                <div className="hd-card-sub">See past sessions</div>
              </div>
            </div>
            <button className="hd-btn hd-outline" onClick={goHistory}>
              View History
            </button>
          </div>
        </section>

        {/* recently meeting */}
        <section className="hd-recent">
          <div className="hd-recent-head">
            <div>
              <div className="hd-recent-title">Recently Meeting</div>
              <div className="hd-recent-sub">
                Your latest conference sessions
              </div>
            </div>
          </div>

          <div className="hd-recent-list">
            {loadingRecent && <div className="hd-empty">Loading…</div>}
            {err && !loadingRecent && (
              <div className="hd-error">Error: {err}</div>
            )}
            {!loadingRecent && !err && recent.length === 0 && (
              <div className="hd-empty">No recent meeting.</div>
            )}

            {!loadingRecent &&
              !err &&
              recent.map((m) => (
                <div key={m.meetingId} className="hd-meet-item">
                  <div className="hd-meet-left">
                    <div className="hd-meet-title">{m.title}</div>
                    <div className="hd-meet-meta">
                      <span className={`hd-badge ${m.status}`}>{m.status}</span>
                      <span className="hd-meta">ID: {m.meetingId}</span>
                      <span className="hd-meta">
                        {m.participants} participants
                      </span>
                      <span className="hd-meta">{toLocalDT(m.startTime)}</span>
                    </div>
                  </div>
                  <button
                    className="hd-btn hd-primary"
                    onClick={() => handleStartMeeting(m)}
                  >
                    Start
                  </button>
                </div>
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}
