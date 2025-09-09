// src/components/MeetingFooter.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import meetingService from "../services/meetingService.js";
import "./meeting-footer.css";

/**
 * MeetingFooter
 * Props:
 * - userRole?: string (default: "participant") → role user untuk menentukan button yang ditampilkan
 * - showEndButton?: boolean (default: false) → tampilkan tombol "End Meeting" (untuk host)
 * - showLeaveButton?: boolean (default: false) → tampilkan tombol "Leave Meeting" (untuk participant)
 * - onEndMeeting?: () => Promise<void> | void → aksi end meeting custom; jika tak ada dipakai default
 * - onLeaveMeeting?: () => Promise<void> | void → aksi leave meeting custom; jika tak ada dipakai default
 * - onMenuClick?: () => void → klik tombol "Menu"
 * - onHelpClick?: () => void → klik tombol "?"
 * - micOn?: boolean
 * - camOn?: boolean
 * - onToggleMic?: () => void
 * - onToggleCam?: () => void
 * - screenShareOn?: boolean
 * - onToggleScreenShare?: () => void
 */
export default function MeetingFooter({
  userRole = "participant",
  showEndButton = false,
  showLeaveButton = false,
  onEndMeeting,
  onLeaveMeeting,
  onMenuClick,
  onHelpClick,
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  screenShareOn,
  onToggleScreenShare,
}) {
  const navigate = useNavigate();

  const defaultEndMeeting = async () => {
    try {
      if (!window.confirm("Are you sure you want to end this meeting?")) return;

      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      const meetingId = cm?.meetingId || cm?.id || cm?.code;
      if (!meetingId) {
        alert("Meeting ID not found. Cannot end meeting.");
        return;
      }

      // Stop screen sharing if active
      if (window.simpleScreenShare && window.simpleScreenShare.isSharing) {
        window.simpleScreenShare.stopScreenShare();
      }

      // Close WebSocket connections
      if (window.meetingWebSocket) {
        window.meetingWebSocket.close();
      }

      await meetingService.endMeeting(meetingId);
      localStorage.removeItem("currentMeeting");
      alert("Meeting ended successfully!");
      navigate("/start");
    } catch (err) {
      console.error("Failed to end meeting:", err);
      alert(`Failed to end meeting: ${err?.message || err}`);
    }
  };

  const defaultLeaveMeeting = async () => {
    try {
      if (!window.confirm("Are you sure you want to leave this meeting?")) return;

      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      const meetingId = cm?.meetingId || cm?.id || cm?.code;
      if (!meetingId) {
        alert("Meeting ID not found. Cannot leave meeting.");
        return;
      }

      // Stop screen sharing if active
      if (window.simpleScreenShare && window.simpleScreenShare.isSharing) {
        window.simpleScreenShare.stopScreenShare();
      }

      // Close WebSocket connections
      if (window.meetingWebSocket) {
        window.meetingWebSocket.close();
      }

      await meetingService.leaveMeeting(meetingId);
      localStorage.removeItem("currentMeeting");
      alert("Left meeting successfully!");
      navigate("/start");
    } catch (err) {
      console.error("Failed to leave meeting:", err);
      alert(`Failed to leave meeting: ${err?.message || err}`);
    }
  };

  const handleEnd = onEndMeeting || defaultEndMeeting;
  const handleLeave = onLeaveMeeting || defaultLeaveMeeting;
  const handleMenu = onMenuClick || (() => navigate("/participant/dashboard"));
  const handleHelp = onHelpClick || (() => alert("Need help?"));

  // Determine which button to show based on user role
  const isHost = userRole === "host" || userRole === "admin";
  const shouldShowEndButton = showEndButton || (isHost && !showLeaveButton);
  const shouldShowLeaveButton = showLeaveButton || (!isHost && !showEndButton);

  return (
    <footer className="pd-bottombar">
      <div className="pd-controls-left">
        <button
          className={`pd-ctrl ${micOn === false ? "is-off" : ""}`}
          title={micOn === false ? "Mic Off" : "Mic"}
          onClick={onToggleMic}
        >
          <Icon slug="mic" />
        </button>
        <button
          className={`pd-ctrl ${camOn === false ? "is-off" : ""}`}
          title={camOn === false ? "Camera Off" : "Camera"}
          onClick={onToggleCam}
        >
          <Icon slug="camera" />
        </button>
        <button className="pd-ctrl" title="Settings">
          <Icon slug="settings" />
        </button>
      </div>

      <div className="pd-controls-right">
        <button
          className="pd-ctrl"
          title="Open Screen Share Page"
          onClick={() => navigate("/menu/screenshare")}
        >
          <Icon slug="screen-share" />
        </button>

        <button className="pd-ghost" onClick={handleMenu}>
          Menu
        </button>

        {shouldShowLeaveButton && (
          <button className="pd-warning" onClick={handleLeave}>
            Leave Meeting
          </button>
        )}

        {shouldShowEndButton && (
          <button className="pd-danger" onClick={handleEnd}>
            End Meeting
          </button>
        )}

        <button className="pd-fab" title="Help" onClick={handleHelp}>
          ?
        </button>
      </div>
    </footer>
  );
}
