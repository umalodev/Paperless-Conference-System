// src/components/MeetingFooter.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "./Icon.jsx";
import meetingService from "../services/meetingService.js";
import { useScreenShare } from "../contexts/ScreenShareContext";
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
  const location = useLocation();

  // 🔹 Ambil state global screen share
  const { sharingUser, screenShareOn, isAnnotating, setIsAnnotating } =
    useScreenShare();

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
  const cm = getCurrentMeeting();
  const meetingId = getMeetingId(cm);

  const isHost = userRole === "host" || userRole === "admin";
  const isDefaultMeeting = Boolean(cm?.isDefault) || String(meetingId) === "1000";

  // Common cleanup
  const cleanupRealtime = () => {
    try {
      if (window.simpleScreenShare?.isSharing) {
        window.simpleScreenShare.stopScreenShare();
      }
    } catch {}
    try {
      if (window.meetingWebSocket) {
        window.meetingWebSocket.close();
      }
    } catch {}
  };

  // Default behaviors
  const defaultBack = async () => {
    try {
      cleanupRealtime();
      if (meetingId) await meetingService.leaveMeeting(meetingId);
    } finally {
      localStorage.removeItem("currentMeeting");
      navigate(isHost ? "/setup" : "/start");
    }
  };

  const defaultEndMeeting = async () => {
    try {
      if (!window.confirm("Are you sure you want to end this meeting?")) return;
      if (!meetingId) return alert("Meeting ID not found.");
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
      if (!meetingId) return alert("Meeting ID not found.");
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
      {/* 🔹 Left Control Group (Mic / Camera) */}
      <div className="pd-controls-left">
        <button
          className={`pd-ctrl ${micOn === false ? "is-off" : ""}`}
          title={micOn === false ? "Mic Off" : "Mic On"}
          onClick={onToggleMic}
        >
          <Icon slug="mic" />
        </button>

        <button
          className={`pd-ctrl ${camOn === false ? "is-off" : ""}`}
          title={camOn === false ? "Camera Off" : "Camera On"}
          onClick={onToggleCam}
        >
          <Icon slug="camera" />
        </button>
      </div>

      {/* 🔹 Right Control Group */}
      <div className="pd-controls-right">
        {/* Screen Share */}
        <button
          className="pd-ctrl"
          title="Screen Share"
          onClick={() => navigate("/menu/screenshare")}
        >
          <Icon slug="screen-share" />
        </button>

        {/* Master Controller — hanya untuk Host/Admin */}
        {isHost && (
          <button
            className="pd-ctrl"
            title="Master Controller"
            onClick={() => navigate("/master-controller")}
            style={{ position: "relative" }}
          >
            <Icon slug="master-controller" />

            {/* 🔴 Badge jika ada orang lain share */}
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
        )}


        {/* Annotation Button */}
        {screenShareOn && (
          <button
            className={`pd-ctrl ${isAnnotating ? "is-active" : ""}`}
            title={
              isAnnotating
                ? String(sharingUser) === String(currentUserId)
                  ? "Stop Annotating Your Screen"
                  : "Stop Annotating Viewer Mode"
                : String(sharingUser) === String(currentUserId)
                ? "Annotate My Screen"
                : "Annotate Shared Screen"
            }
            onClick={() => setIsAnnotating(!isAnnotating)}
          >
            <Icon slug="annotate" />
          </button>
        )}

        {/* Menu / Back / End */}
        <button className="pd-ghost" onClick={handleMenu}>
          Menu
        </button>

        {showBackButton && (
          <button className="pd-outline" onClick={handleBack}>
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
