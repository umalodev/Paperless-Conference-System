import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!localStorage.getItem("user")) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("currentMeeting"); // kalau kamu simpan ini
    navigate("/", { replace: true }); // kembali ke start & cegah back
  };

  return (
    <div className="hd-root">
      <header className="hd-topbar">
        <div className="hd-brand">
          <img src="/img/logo.png" alt="Umalo" className="hd-logo" />
          <div className="hd-title">
            <div className="hd-title-row">
              <img src="/img/pc.png" alt="" className="hd-monitor-icon" />
              <span className="hd-brand-text">Host Dashboard</span>
            </div>
            <span className="hd-subwelcome">welcome back, name</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="hd-logout"
          type="button"
          aria-label="Logout"
        >
          <span className="hd-logout-icon">↗</span>
          Logout
        </button>
      </header>

      {/* Quick Cards */}
      <section className="hd-cards">
        {/* Quick Start */}
        <div className="hd-card">
          <div className="hd-card-head">
            <span className="hd-card-icon">▶</span>
            <h3 className="hd-card-title">Quick Start</h3>
          </div>
          <p className="hd-card-desc">Start an instant meeting right now</p>
          <button className="hd-btn hd-btn-primary">Start Meeting</button>
        </div>

        {/* Schedule Meeting */}
        <div className="hd-card">
          <div className="hd-card-head">
            <span className="hd-card-icon">⚙</span>
            <h3 className="hd-card-title">Schedule Meeting</h3>
          </div>
          <p className="hd-card-desc">Plan a meeting for later</p>
          <button className="hd-btn hd-btn-outline">Schedule</button>
        </div>

        {/* Meeting History */}
        <div className="hd-card">
          <div className="hd-card-head">
            <span className="hd-card-icon">👥</span>
            <h3 className="hd-card-title">Meeting History</h3>
          </div>
          <p className="hd-card-desc">Plan a meeting for later</p>
          <button className="hd-btn hd-btn-outline">View History</button>
        </div>
      </section>

      {/* Recently Meeting */}
      <section className="hd-recent">
        <h2 className="hd-recent-title">Recently Meeting</h2>
        <p className="hd-recent-sub">Your latest conference sessions</p>

        <ul className="hd-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="hd-list-item">
              <div className="hd-list-main">
                <div className="hd-list-title">
                  <strong>Weekly Team Standup</strong>
                  <span className="hd-badge">scheduled</span>
                </div>

                <div className="hd-meta">
                  <span className="hd-meta-item">
                    <span className="hd-meta-label">ID:</span> MTG-001
                  </span>
                  <span className="hd-meta-item">
                    <span className="hd-meta-label">0</span> participants
                  </span>
                  <span className="hd-meta-item">2025-08-18 10:00</span>
                </div>
              </div>

              <button className="hd-btn hd-btn-primary hd-btn-start">
                Start
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
