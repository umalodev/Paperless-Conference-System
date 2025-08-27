import React, { useEffect, useMemo, useState } from "react";
import "./SetUp.css";
import { useNavigate } from "react-router-dom";
import meetingService from "../../services/meetingService.js";
import MeetingWizardModal from "./components/MeetingWizardModal.jsx";

export default function SetUp() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [scheduled, setScheduled] = useState([]);
  const [loadingScheduled, setLoadingScheduled] = useState(true);
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);

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

  const handleSaveMeeting = async (payload) => {
    // TODO: sambungkan ke backend kamu
    // contoh: await meetingService.scheduleMeeting(payload)
    console.log("payload to save:", payload);
    setShowWizard(false);
  };

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setErr("");
        setLoadingScheduled(true);

        // 1) jika service khusus ada
        let res = meetingService.getScheduledMeetings
          ? await meetingService.getScheduledMeetings()
          : null;

        // 2) fallback → pakai recent/active lalu filter ke scheduled
        if (!res || !Array.isArray(res?.data)) {
          if (meetingService.getRecentMeetings) {
            res = await meetingService.getRecentMeetings();
          } else {
            res = await meetingService.getActiveMeetings();
          }
        }

        const arr = Array.isArray(res?.data) ? res.data : [];

        // normalisasi + hanya yang scheduled + sort ascending by startTime
        const list = arr
          .map((m) => ({
            meetingId: m.meetingId || m.id || String(Math.random()),
            title: m.title || "Untitled Meeting",
            status: (m.status || "scheduled").toLowerCase(),
            startTime: m.startTime || m.start_time || m.scheduledAt || null,
            participants: m.participants || 0,
          }))
          .filter((m) => m.status === "scheduled")
          .sort((a, b) => {
            const da = a.startTime ? new Date(a.startTime).getTime() : Infinity;
            const db = b.startTime ? new Date(b.startTime).getTime() : Infinity;
            return da - db;
          });

        if (!cancel) setScheduled(list);
      } catch (e) {
        if (!cancel) setErr(String(e.message || e));
      } finally {
        if (!cancel) setLoadingScheduled(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const goSchedule = () => setShowWizard(true);
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

  // Quick Start (instan)
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

  // Start meeting yang terjadwal
  const handleStartMeeting = async (m) => {
    setErr("");
    try {
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
            <MeetingWizardModal
              open={showWizard}
              onClose={() => setShowWizard(false)}
              onSave={handleSaveMeeting}
            />
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

        {/* scheduled meeting */}
        <section className="hd-recent">
          <div className="hd-recent-head">
            <div>
              <div className="hd-recent-title">Scheduled Meetings</div>
              <div className="hd-recent-sub">Meetings you’ve planned</div>
            </div>
          </div>

          <div className="hd-recent-list">
            {loadingScheduled && <div className="hd-empty">Loading…</div>}
            {err && !loadingScheduled && (
              <div className="hd-error">Error: {err}</div>
            )}
            {!loadingScheduled && !err && scheduled.length === 0 && (
              <div className="hd-empty">No scheduled meetings.</div>
            )}

            {!loadingScheduled &&
              !err &&
              scheduled.map((m) => (
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
