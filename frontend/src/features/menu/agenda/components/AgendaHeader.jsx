// src/features/agenda/components/AgendaHeader.jsx
import React from "react";

export default function AgendaHeader({ displayName, user }) {
  const currentMeeting = (() => {
    try {
      return JSON.parse(localStorage.getItem("currentMeeting")) || {};
    } catch {
      return {};
    }
  })();

  return (
    <header className="pd-topbar">
      <div className="pd-left">
        <span className="pd-live" aria-hidden />
        <div>
          <h1 className="pd-title">
            {currentMeeting.title || "Meeting Default"}
          </h1>
        </div>
      </div>
      <div className="pd-right">
        <div className="pd-clock" aria-live="polite">
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="pd-user">
          <div className="pd-avatar">
            {(displayName || user?.username || "US").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="pd-user-name">
              {displayName || user?.username || "Participant"}
            </div>
            <div className="pd-user-role">{user?.role || "Participant"}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
