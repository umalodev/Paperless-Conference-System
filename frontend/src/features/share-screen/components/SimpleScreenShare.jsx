import React, { useState, useEffect, useRef } from "react";
import simpleScreenShare from "../../../services/simpleScreenShare";
import "../styles/SimpleScreenShare.css";
import AnnotateZoomCanvas from "../../../components/AnnotateZoomCanvas";
import { useScreenShare } from "../../../contexts/ScreenShareContext";

const SimpleScreenShare = ({ meetingId, userId }) => {
  const [internalIsSharing, setInternalIsSharing] = useState(false);
  const [receivedStream, setReceivedStream] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shareEndedMsg, setShareEndedMsg] = useState(""); // 🆕 notification text

  const imageRef = useRef(null);
  const overlayRef = useRef(null);

  const {
    sharingUser,
    setSharingUser,
    screenShareOn,
    setScreenShareOn,
    isAnnotating,
    setIsAnnotating,
  } = useScreenShare();

  // ======================================================
  // 🔹 Helper: Ambil info user (displayName & role)
  // ======================================================
  const getUserInfo = (id) => {
    try {
      // 1️⃣ Ambil current user lengkap dari localStorage
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (String(id) === String(currentUser.id)) {
        return {
          id: currentUser.id,
          displayName: currentUser.displayName || currentUser.username || "Unknown",
          role: currentUser.role || "Participant",
        };
      }

      // 2️⃣ Coba ambil dari daftar participant (kalau sudah pernah disimpan)
      const allUsers = JSON.parse(localStorage.getItem("participants") || "[]");
      const found = allUsers.find((u) => String(u.id) === String(id));
      if (found) return found;

      // 3️⃣ Fallback ke socket global (opsional)
      if (window.meetingParticipants) {
        const maybe = window.meetingParticipants.find((u) => String(u.id) === String(id));
        if (maybe) return maybe;
      }

      // 4️⃣ Fallback terakhir
      return { id, displayName: `User ${id}`, role: "Participant" };
    } catch (err) {
      return { id, displayName: `User ${id}`, role: "Participant" };
    }
  };


  // ======================================================
  // 🔹 State Derivative
  // ======================================================
  const isSharing = screenShareOn && String(sharingUser?.id || sharingUser) === String(userId);
  const someoneElseSharing =
    Boolean(sharingUser) && String(sharingUser?.id || sharingUser) !== String(userId);

  // ======================================================
  // 🔹 Initialize & Listeners
  // ======================================================
  useEffect(() => {
    if (meetingId && userId) {
      initializeScreenShare();
    }
  }, [meetingId, userId]);

  const setupEventListeners = () => {
  simpleScreenShare.onScreenShareStart = (data) => {
    // 🧩 Ambil dari data socket langsung (sudah dikirim dari simpleScreenShare.js)
    const sharer = {
      id: data.userId,
      displayName: data.displayName || getUserInfo(data.userId).displayName,
      role: data.role || getUserInfo(data.userId).role,
    };

    setSharingUser(sharer);
    setScreenShareOn(true);

    if (String(data.userId) === String(userId)) {
      setInternalIsSharing(true);
    }

    setShareEndedMsg("");
};

    simpleScreenShare.onScreenShareStop = (data) => {
      setSharingUser(null);
      setScreenShareOn(false);
      setIsAnnotating(false);
      setReceivedStream(null);
      if (String(data.userId) === String(userId)) {
        setInternalIsSharing(false);
      } else {
        setShareEndedMsg("📢 Screen share has ended.");
        setTimeout(() => setShareEndedMsg(""), 3000);
      }
    };

    simpleScreenShare.onScreenShareReceived = (data) => {
      const sharer = {
        id: data.userId,
        displayName: data.displayName || getUserInfo(data.userId).displayName,
        role: data.role || getUserInfo(data.userId).role,
      };
      setReceivedStream({ ...data, timestamp: Date.now() });
      setSharingUser(sharer);
    };
  };

  const initializeScreenShare = async () => {
    await simpleScreenShare.initialize(meetingId, userId);
    setupEventListeners();
  };

  // ======================================================
  // 🔹 Start / Stop Controls
  // ======================================================
  const handleStartShare = async () => {
    if (someoneElseSharing) return;
    setIsLoading(true);
    try {
      const success = await simpleScreenShare.startScreenShare();
      if (success) {
        const self = getUserInfo(userId);
        setSharingUser(self);
        setScreenShareOn(true);
      }
    } catch (err) {
      console.error("Start share failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopShare = () => {
    simpleScreenShare.stopScreenShare();
    setInternalIsSharing(false);
    setSharingUser(null);
    setScreenShareOn(false);
    setIsAnnotating(false);
  };

  // ======================================================
  // 🔹 Update Image when receiving new frame
  // ======================================================
  useEffect(() => {
    if (receivedStream && imageRef.current) {
      imageRef.current.src = receivedStream.imageData;
    }
  }, [receivedStream]);

  // ======================================================
  // 🔹 Render
  // ======================================================
  return (
    <div className="simple-screen-share">
      <div className="screen-share-header">
        <h3>Screen Share</h3>
        <div className="screen-share-controls">
          {isSharing ? (
            <button onClick={handleStopShare} className="btn btn-danger">
              Stop Share
            </button>
          ) : someoneElseSharing ? (
            <button className="btn" disabled>
              Someone is sharing…
            </button>
          ) : (
            <button
              onClick={handleStartShare}
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? "Starting..." : "Start Share"}
            </button>
          )}
        </div>
      </div>

      <div className="screen-share-content">
        {(receivedStream || isSharing) ? (
          <div className="received-screen-share">
            <div className="share-info">
              <span className="live-indicator">🔴 LIVE</span>
              <span>
                {isSharing
                  ? `Sharing: user ${userId}`
                  : sharingUser
                  ? `Sharing: user ${sharingUser.id || sharingUser}`
                  : "No one is sharing"}
              </span>
            </div>
            <div className="video-container" ref={overlayRef}>
              {isSharing ? (
  <>
    <div className="sharing-placeholder">
      <p>🔴 You are sharing your screen</p>
    </div>
    {isAnnotating && (
      <AnnotateZoomCanvas attachTo={overlayRef} mode="full" />
    )}
  </>
) : (
  <>
    <img
      ref={imageRef}
      alt="Screen Share"
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
    {isAnnotating && (
      <AnnotateZoomCanvas attachTo={overlayRef} mode="receive-only" />
    )}
  </>
)}

            </div>
          </div>
        ) : (
          <div className="no-screen-share">
            <p>No screen share active</p>
            {shareEndedMsg && (
              <div
                className="share-ended-banner"
                style={{
                  position: "fixed",
                  bottom: "40px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(30, 30, 30, 0.85)",
                  color: "#fff",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontWeight: 500,
                  fontSize: "15px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                  animation: "fadeInOut 3s ease-in-out forwards",
                  zIndex: 9999,
                }}
              >
                {shareEndedMsg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleScreenShare;
