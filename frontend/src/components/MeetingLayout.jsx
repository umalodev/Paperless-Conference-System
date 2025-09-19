import React, { useEffect, useState } from "react";
import meetingWebSocketService from "../services/meetingWebSocket.js";
import { API_URL } from "../config.js";
import "./MeetingLayout.css";

/**
 * MeetingLayout Component
 * Layout wrapper untuk meeting dengan screen share preview embedded dalam menu content
 */
const MeetingLayout = ({
  children,
  meetingId,
  userId,
  userRole,
  socket,
  mediasoupDevice,
  className = "",
  disableAutoConnect = false,
}) => {
  // Internal state for screen sharing
  const [screenShareError, setScreenShareError] = useState("");

  useEffect(() => {
    if (disableAutoConnect) return;
    if (socket) return;
    const token = localStorage.getItem("token");
    if (
      meetingId &&
      userId &&
      token &&
      !meetingWebSocketService.isConnected()
    ) {
      meetingWebSocketService.connect(meetingId, userId, API_URL, token);
    }
    return () => {
      if (!socket && !disableAutoConnect) meetingWebSocketService.disconnect();
    };
  }, [disableAutoConnect, socket, meetingId, userId]);

  const ws = socket ?? meetingWebSocketService.getSocket();

  return (
    <div className={`meeting-layout ${className}`}>
      {/* Screen Share Error Notification */}
      {screenShareError && (
        <div
          className="pd-error"
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 1000,
            padding: "12px 16px",
            borderRadius: "8px",
            backgroundColor: "#fee2e2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            maxWidth: "300px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>⚠️</span>
            <span>{screenShareError}</span>
            <button
              onClick={() => setScreenShareError("")}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                color: "#dc2626",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Menu Content - Always full width */}
      <div className="menu-section">
        {/* Menu content */}
        <div className="menu-content">{children}</div>
      </div>
    </div>
  );
};

export default MeetingLayout;
