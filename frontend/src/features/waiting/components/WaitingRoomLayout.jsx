import React from "react";
import "../styles/waitingRoom.css";
import useMeetingRoom from "../hooks/useMeetingRoom";

export default function WaitingRoomLayout() {
  const {
    role,
    meetingId,
    meetingCode,
    started,
    loading,
    err,
    actionLoading,
    currentMeeting,
    who,
    handleStart,
    leave,
  } = useMeetingRoom();

  if (loading) {
    return (
      <div className="wr-app">
        {" "}
        <main className="wr-main">
          {" "}
          <div className="wr-card">Loading meeting data…</div>{" "}
        </main>{" "}
      </div>
    );
  }

  if (!meetingId) {
    return (
      <div className="wr-app">
        {" "}
        <main className="wr-main">
          {" "}
          <div className="wr-card">
            {" "}
            <div className="wr-error">
              No meeting information found. Please go back to start page.{" "}
            </div>{" "}
            <button className="wr-btn wr-ghost" onClick={leave}>
              Go Back to Start{" "}
            </button>{" "}
          </div>{" "}
        </main>{" "}
      </div>
    );
  }

  return (
    <div className="wr-app">
      {" "}
      <header className="wr-topbar">
        {" "}
        <div className="wr-left">
          {" "}
          <span className="wr-live" aria-hidden />{" "}
          <div className="wr-title-wrap">
            {" "}
            <h1 className="wr-title">Waiting Room</h1>{" "}
            <div className="wr-sub">Meeting ID: {meetingId}</div>{" "}
          </div>{" "}
        </div>{" "}
        <div className="wr-right">
          {" "}
          <div className="wr-clock">
            {new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
          </div>{" "}
          <div className="wr-user-badge">
            {" "}
            <div className="wr-avatar">
              {who.slice(0, 2).toUpperCase()}
            </div>{" "}
            <div className="wr-user-meta">
              {" "}
              <div className="wr-user-name">{who}</div>{" "}
              <div className="wr-user-role">
                {role === "host" ? "Host" : "Participant"}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </header>
      ```
      <main className="wr-main">
        <div className="wr-card">
          {!started && (
            <div
              className={`wr-badge ${role === "host" ? "is-host" : "is-wait"}`}
            >
              {role === "host" ? "Ready to start" : "Waiting for host to start"}
            </div>
          )}

          <h2 className="wr-heading">
            {role === "host"
              ? "Mulai rapat saat semua siap"
              : "Kamu sudah di ruang tunggu"}
          </h2>
          <p className="wr-desc">
            {role === "host"
              ? "Peserta akan otomatis masuk ke ruang rapat ketika kamu menekan Start Meeting."
              : "Begitu host memulai rapat, kamu akan otomatis diarahkan ke ruang rapat."}
          </p>

          {currentMeeting && (
            <div className="wr-meeting-info">
              <strong>Meeting:</strong>{" "}
              {currentMeeting.title || "Conference Meeting"}
              <br />
              <strong>ID:</strong> {meetingId}
              <br />
              <strong>Status:</strong> {currentMeeting.status || "waiting"}
            </div>
          )}

          {role !== "host" && !started && (
            <div className="wr-wait">
              <div className="wr-spin" />
              <div className="wr-wait-text">Menunggu host…</div>
            </div>
          )}

          <div className="wr-actions">
            {role === "host" ? (
              <button
                className="wr-btn wr-primary"
                onClick={handleStart}
                disabled={actionLoading || started}
              >
                {actionLoading ? "Memulai…" : "Start Meeting"}
              </button>
            ) : (
              <button className="wr-btn wr-muted" disabled>
                Menunggu…
              </button>
            )}
            <button className="wr-btn wr-ghost" onClick={leave}>
              Leave
            </button>
          </div>

          <div className="wr-foot">
            <span className="wr-dot" /> Meeting Code:{" "}
            <strong>{meetingCode}</strong>
          </div>

          {err && <div className="wr-error">Gagal memuat status: {err}</div>}
        </div>
      </main>
    </div>
  );
}
