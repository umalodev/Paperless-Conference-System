// src/components/MeetingHeader.jsx
import React, { useEffect, useState } from "react";
import { formatTime } from "../utils/format.js";

/**
 * Komponen header global fleksibel:
 * - Bisa tampil minimal (default)
 * - Bisa menampilkan sub info seperti Meeting ID
 * - Bisa menampilkan tombol logout
 * - Bisa disesuaikan untuk halaman Dashboard atau Meeting Feature
 */
export default function MeetingHeader({
  title,            // Judul meeting (opsional)
  meetingId,        // ID Meeting (opsional)
  displayName,      // Nama tampil user
  user,             // Object user {role, username, ...}
  onLogout,         // Callback tombol logout (opsional)
  showId = false,   // Tampilkan ID meeting di bawah title
  showLogout = false, // Tampilkan tombol logout di kanan
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const meetingTitle =
    title ||
    (() => {
      try {
        const raw = localStorage.getItem("currentMeeting");
        const cm = raw ? JSON.parse(raw) : null;
        return cm?.title || "Meeting Default";
      } catch {
        return "Meeting Default";
      }
    })();

  return (
    <header className="pd-topbar">
      <div className="pd-left">
        <span className="pd-live" aria-hidden />
        <div>
          <h1 className="pd-title">{meetingTitle}</h1>
          {showId && meetingId && (
            <div className="pd-sub">ID: {meetingId}</div>
          )}
        </div>
      </div>

      <div className="pd-right">
        <div className="pd-clock" aria-live="polite">
          {formatTime(now)}
        </div>
        <div className="pd-user">
          <div className="pd-avatar">
            {(displayName || user?.username || "??").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="pd-user-name">
              {displayName || user?.username || "Participant"}
            </div>
            <div className="pd-user-role">{user?.role || "Participant"}</div>
          </div>
          {showLogout && (
            <button
              className="pd-ghost"
              style={{ marginLeft: 8 }}
              onClick={onLogout}
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
