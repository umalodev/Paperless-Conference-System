// src/components/MeetingLayout.jsx
import React, { useEffect, useState, useRef } from "react";
import meetingSocketService from "../services/meetingSocketService.js";
import { API_URL } from "../config.js";
import "./MeetingLayout.css";
import meetingService from "../services/meetingService.js";
import { useScreenShare } from "../contexts/ScreenShareContext";

const MeetingLayout = ({
  children,
  meetingId,
  userId,
  userRole,
  socket,
  mediasoupDevice,
  className = "",
  meetingTitle = "",
  disableMeetingSocket = false,
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

      // Hanya connect kalau belum terkoneksi
      if (!meetingSocketService.isConnected()) {
        console.log("🧩 [MeetingLayout] Connecting meeting socket (once)...");
        meetingSocketService.connect(meetingId, userId, API_URL);
      }
    }
  }, [meetingId, userId, disableMeetingSocket]);

  useEffect(() => {
    let timer;

    const saveBadge = (slug, value) => {
      try {
        const key = "badge.map";
        const raw = localStorage.getItem(key);
        const map = raw ? JSON.parse(raw) : {};
        if (map[slug] === value) return;
        map[slug] = value;
        localStorage.setItem(key, JSON.stringify(map));
        window.dispatchEvent(new Event("badge:changed"));
      } catch {}
    };

    const tick = async () => {
      try {
        if (document.visibilityState !== "visible") return;

        const raw = localStorage.getItem("currentMeeting");
        const cm = raw ? JSON.parse(raw) : null;
        const mid = cm?.id || cm?.meetingId || cm?.code || null;
        const qs = mid ? `?meetingId=${encodeURIComponent(mid)}` : "";

        const endpoints = [
          ["agenda", `${API_URL}/api/agendas/unread-count${qs}`],
          ["materials", `${API_URL}/api/materials/unread-count${qs}`],
          ["files", `${API_URL}/api/files/unread-count${qs}`],
          ["survey", `${API_URL}/api/surveys/unread-count${qs}`],
          ["services", `${API_URL}/api/services/unread-count${qs}`],
        ];

        const reqs = endpoints.map(([slug, url]) =>
          fetch(url, { headers: meetingService.getAuthHeaders() })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => [slug, Number(j?.data?.unread || 0)])
            .catch(() => [slug, undefined])
        );

        const results = await Promise.all(reqs);
        for (const [slug, unread] of results) {
          if (typeof unread === "number") saveBadge(slug, unread);
        }
      } catch {
        /* noop */
      }
    };

    tick();
    timer = setInterval(tick, 15000);

    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

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
