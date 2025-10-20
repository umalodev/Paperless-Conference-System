// src/features/whiteboard/components/WhiteboardHeader.jsx
import React from "react";

export default function WhiteboardHeader({ displayName, userRole, meetingTitle }) {
  return (
    <header className="pd-topbar">
      <div className="pd-left">
        <span className="pd-live" aria-hidden />
        <div>
          <h1 className="pd-title">{meetingTitle || "Meeting Default"}</h1>
        </div>
      </div>
      <div className="pd-right">
        <div className="pd-clock" aria-live="polite">
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="pd-user">
          <div className="pd-avatar">{displayName?.slice(0, 2).toUpperCase()}</div>
          <div>
            <div className="pd-user-name">{displayName || "Participant"}</div>
            <div className="pd-user-role">{userRole || "participant"}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
