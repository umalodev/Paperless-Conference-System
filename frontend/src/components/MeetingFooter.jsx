// src/components/MeetingFooter.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import meetingService from "../services/meetingService.js";
import "./meeting-footer.css";

export default function MeetingFooter({
  userRole = "participant",
  onEndMeeting,
  onLeaveMeeting,
  onMenuClick,
  onHelpClick,
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
}) {
  const navigate = useNavigate();

  // Helpers
  const getCurrentMeeting = () => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const getMeetingId = (cm) => cm?.meetingId || cm?.id || cm?.code;

  // Role & meeting flags
  const isHost = userRole === "host" || userRole === "admin";
  const cm = getCurrentMeeting();
  const meetingId = getMeetingId(cm);
  const isDefaultMeeting =
    Boolean(cm?.isDefault) || String(meetingId) === "1000"; // fallback ke 1000 bila flag belum terset

  // Common cleanup (stop share, close WS)
  const cleanupRealtime = () => {
    try {
      if (window.simpleScreenShare && window.simpleScreenShare.isSharing) {
        window.simpleScreenShare.stopScreenShare();
      }
    } catch {}
    try {
      if (window.meetingWebSocket) {
        window.meetingWebSocket.close();
      }
    } catch {}
  };

  // BACK action (participant: ke /start, host default: ke /setup)
  const defaultBack = async () => {
    try {
      cleanupRealtime();
      if (meetingId) {
        // tetap panggil leave agar backend konsisten
        await meetingService.leaveMeeting(meetingId);
      }
    } catch (err) {
      // tidak blok navigasi
      console.warn("leaveMeeting failed on back:", err);
    } finally {
      localStorage.removeItem("currentMeeting");
      if (isHost) {
        // host/admin
        navigate("/setup");
      } else {
        // participant
        navigate("/start");
      }
    }
  };

  // END action (hanya untuk host non-default)
  const defaultEndMeeting = async () => {
    try {
      if (!window.confirm("Are you sure you want to end this meeting?")) return;
      if (!meetingId) {
        alert("Meeting ID not found. Cannot end meeting.");
        return;
      }
      cleanupRealtime();
      await meetingService.endMeeting(meetingId);
      localStorage.removeItem("currentMeeting");
      alert("Meeting ended successfully!");
      // setelah end → kembali ke halaman setup host
      navigate("/setup");
    } catch (err) {
      console.error("Failed to end meeting:", err);
      alert(`Failed to end meeting: ${err?.message || err}`);
    }
  };

  // (dipertahankan untuk kompatibilitas, tapi tidak ditampilkan untuk participant)
  const defaultLeaveMeeting = async () => {
    try {
      if (!window.confirm("Are you sure you want to leave this meeting?"))
        return;
      if (!meetingId) {
        alert("Meeting ID not found. Cannot leave meeting.");
        return;
      }
      cleanupRealtime();
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
  const handleBack = defaultBack;
  const handleMenu = onMenuClick || (() => navigate("/participant/dashboard"));
  const handleHelp = onHelpClick || (() => alert("Need help?"));

  // 🔎 Final UI rules:
  // - Participant: hanya Back
  // - Host/Admin + Default: hanya Back
  // - Host/Admin + Non-default: hanya End
  const showBackButton = !isHost || (isHost && isDefaultMeeting);
  const showEndButton = isHost && !isDefaultMeeting;
  const showLeaveButton = false; // disembunyikan sesuai requirement

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

        {showBackButton && (
          <button className="pd-outline" onClick={handleBack} title="Back">
            Home
          </button>
        )}

        {showLeaveButton && (
          <button className="pd-warning" onClick={handleLeave}>
            Leave Meeting
          </button>
        )}

        {showEndButton && (
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
