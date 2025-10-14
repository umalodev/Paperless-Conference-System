// src/components/MeetingLayout.jsx
import React, { useEffect, useState, useRef } from "react";
import meetingSocketService from "../services/meetingSocketService.js"; // ✅ Ganti dari meetingWebSocketService
import { API_URL } from "../config.js";
import "./MeetingLayout.css";

import { useScreenShare } from "../contexts/ScreenShareContext";
import AnnotateZoomCanvas from "./AnnotateZoomCanvas";

const MeetingLayout = ({
  children,
  meetingId,
  userId,
  userRole,
  socket,
  mediasoupDevice,
  className = "",
  meetingTitle = "",
  disableMeetingSocket = false, // <=== tetap bisa dinonaktifkan
}) => {
  const [screenShareError, setScreenShareError] = useState("");
  const [title, setTitle] = useState(meetingTitle || "");

  const { isAnnotating, setIsAnnotating, sharingUser } = useScreenShare();

  const currentUserId = (() => {
    try {
      const raw = localStorage.getItem("user");
      const u = raw ? JSON.parse(raw) : null;
      return u?.id || u?._id || u?.userId || null;
    } catch {
      return null;
    }
  })();

  // host ref untuk kanvas global (overlay anotasi)
  const annotateHostRef = useRef(null);

  // 🔌 Koneksi ke meetingSocketService
  useEffect(() => {
    if (disableMeetingSocket) return;
    if (meetingId && userId) {
      if (typeof window !== "undefined") {
        window.meetingSocketService = meetingSocketService;
      }

      console.log("🧩 [MeetingLayout] Connecting meeting socket...");
      meetingSocketService.connect(meetingId, userId, API_URL);

      return () => {
        console.log("🧩 [MeetingLayout] Disconnecting meeting socket...");
        meetingSocketService.disconnect();
      };
    }
  }, [meetingId, userId, disableMeetingSocket]);

  return (
    <div className={`meeting-layout ${className}`}>
      {/* === CONTENT WRAPPER === */}
      <div className="menu-section">
        <div className="menu-content">{children}</div>
      </div>

      {/* === OPTIONAL ERROR NOTIFICATION === */}
      {screenShareError && (
        <div
          className="pd-error"
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 1000,
            padding: "12px 16px",
            borderRadius: 8,
            backgroundColor: "#fee2e2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            maxWidth: 300,
            boxShadow: "0 4px 6px rgba(0,0,0,.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span>{screenShareError}</span>
            <button
              onClick={() => setScreenShareError("")}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                color: "#dc2626",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* === GLOBAL ANNOTATE OVERLAY === */}
      {isAnnotating && String(sharingUser) === String(currentUserId) && (
        <div
          ref={annotateHostRef}
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 9999,
            pointerEvents: "auto",
          }}
        >
          <AnnotateZoomCanvas
            attachTo={annotateHostRef}
            global={true}
            onClose={() => setIsAnnotating(false)}
          />
        </div>
      )}
    </div>
  );
};

export default MeetingLayout;
