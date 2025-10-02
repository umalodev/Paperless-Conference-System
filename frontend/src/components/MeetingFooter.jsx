// src/components/MeetingFooter.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import meetingService from "../services/meetingService.js";
import { useScreenShare } from "../contexts/ScreenShareContext";
import "./meeting-footer.css";
import { useLocation } from "react-router-dom";


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

  // 🔹 Ambil state global screen share
  const {
    sharingUser,
    screenShareOn,
    isAnnotating,
    setIsAnnotating,
  } = useScreenShare();

  const currentUserId = (() => {
    try {
      const rawUser = localStorage.getItem("user");
      const u = rawUser ? JSON.parse(rawUser) : null;
      return u?.id || u?._id || u?.userId || null;
    } catch {
      return null;
    }
  })();

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
    Boolean(cm?.isDefault) || String(meetingId) === "1000";

  const location = useLocation();
  // Common cleanup
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

  const defaultBack = async () => {
    try {
      cleanupRealtime();
      if (meetingId) {
        await meetingService.leaveMeeting(meetingId);
      }
    } finally {
      localStorage.removeItem("currentMeeting");
      if (isHost) navigate("/setup");
      else navigate("/start");
    }
  };

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
      navigate("/setup");
    } catch (err) {
      alert(`Failed to end meeting: ${err?.message || err}`);
    }
  };

  const defaultLeaveMeeting = async () => {
    try {
      if (!window.confirm("Are you sure you want to leave this meeting?")) return;
      if (!meetingId) {
        alert("Meeting ID not found. Cannot leave meeting.");
        return;
      }
      cleanupRealtime();
      await meetingService.leaveMeeting(meetingId);
      localStorage.removeItem("currentMeeting");
      navigate("/start");
    } catch (err) {
      alert(`Failed to leave meeting: ${err?.message || err}`);
    }
  };

  const handleEnd = onEndMeeting || defaultEndMeeting;
  const handleLeave = onLeaveMeeting || defaultLeaveMeeting;
  const handleBack = defaultBack;
  const handleMenu = onMenuClick || (() => navigate("/participant/dashboard"));
  const handleHelp = onHelpClick || (() => alert("Need help?"));

  const showBackButton = !isHost || (isHost && isDefaultMeeting);
  const showEndButton = isHost && !isDefaultMeeting;

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
      </div>

      <div className="pd-controls-right">
        <button
          className="pd-ctrl"
          title="Open Screen Share Page"
          onClick={() => navigate("/menu/screenshare")}
          style={{ position: "relative" }}
        >
          <Icon slug="screen-share" />

          {/* 🔴 Badge merah kalau ada orang lain share */}
          {screenShareOn && String(sharingUser) !== String(currentUserId) && (
            <>
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "red",
                  boxShadow: "0 0 6px rgba(0,0,0,0.4)",
                }}
              />
              
              {/* 🔹 Tooltip hanya muncul kalau bukan di halaman screenshare */}
              {location.pathname !== "/menu/screenshare" && (
                <div
                  style={{
                    position: "absolute",
                    top: -36,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "red",
                    color: "white",
                    fontSize: 12,
                    padding: "4px 8px",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                  }}
                >
                  Someone is sharing
                  <div
                    style={{
                      position: "absolute",
                      bottom: -6,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 0,
                      height: 0,
                      borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent",
                      borderTop: "6px solid red",
                    }}
                  />
                </div>
              )}
            </>
          )}
        </button>


        {screenShareOn && String(sharingUser) === String(currentUserId) && (
          <button
            className={`pd-ctrl ${isAnnotating ? "is-active" : ""}`}
            title={isAnnotating ? "Stop Annotate" : "Start Annotate"}
            onClick={() => setIsAnnotating(!isAnnotating)}
          >
            <Icon slug="annotate" />
          </button>
        )}

        <button className="pd-ghost" onClick={handleMenu}>
          Menu
        </button>

        {showBackButton && (
          <button className="pd-outline" onClick={handleBack} title="Back">
            Home
          </button>
        )}

        {showEndButton && (
          <button className="pd-danger" onClick={handleEnd}>
            End Meeting
          </button>
        )}
      </div>
    </footer>
  );
}
