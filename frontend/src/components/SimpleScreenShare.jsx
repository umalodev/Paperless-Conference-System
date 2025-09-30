import React, { useState, useEffect, useRef } from "react";
import simpleScreenShare from "../services/simpleScreenShare";
import "./SimpleScreenShare.css";
import AnnotateZoomCanvas from "./AnnotateZoomCanvas"; // ⬅️ Import komponen anotasi

/**
 * Simple Screen Share Component
 */
const SimpleScreenShare = ({
  meetingId,
  userId,
  isSharing: externalIsSharing,
  onSharingChange: externalOnSharingChange,
  onError: externalOnError,
}) => {
  const [internalIsSharing, setInternalIsSharing] = useState(false);
  const [receivedStream, setReceivedStream] = useState(null);
  const [sharingUser, setSharingUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [isAnnotating, setIsAnnotating] = useState(false); // ⬅️ state untuk anotasi

  const imageRef = useRef(null);
  const overlayRef = useRef(null);

  // pakai state eksternal kalau ada
  const isSharing =
    externalIsSharing !== undefined ? externalIsSharing : internalIsSharing;
  const setIsSharing = externalOnSharingChange || setInternalIsSharing;
  const setError = externalOnError || (() => {});

  const someoneElseSharing =
    Boolean(sharingUser) && String(sharingUser) !== String(userId);

  useEffect(() => {
    if (meetingId && userId) {
      if (
        !simpleScreenShare.meetingId ||
        simpleScreenShare.meetingId !== meetingId
      ) {
        initializeScreenShare();
      } else {
        setupEventListeners();
        syncFromService();
      }
    }
    return () => {};
  }, [meetingId, userId]);

  const setupEventListeners = () => {
    const originalOnStart = simpleScreenShare.onScreenShareStart;
    const originalOnStop = simpleScreenShare.onScreenShareStop;
    const originalOnReceived = simpleScreenShare.onScreenShareReceived;

    simpleScreenShare.onScreenShareStart = (data) => {
      setSharingUser(data.userId);
      if (String(data.userId) === String(userId)) {
        setIsSharing(true);
      }
      if (originalOnStart) originalOnStart(data);
    };

    simpleScreenShare.onScreenShareStop = (data) => {
      setSharingUser(null);
      setReceivedStream(null);
      if (String(data.userId) === String(userId)) {
        setIsSharing(false);
      }
      if (originalOnStop) originalOnStop(data);
    };

    simpleScreenShare.onScreenShareReceived = (data) => {
      setReceivedStream({ ...data, timestamp: Date.now() });
      setSharingUser(data.userId);
      if (originalOnReceived) originalOnReceived(data);
    };
  };

  const initializeScreenShare = async () => {
    await simpleScreenShare.initialize(meetingId, userId);
    setupEventListeners();
    syncFromService();
  };

  const syncFromService = () => {
    try {
      const currentlySharing = !!simpleScreenShare.isSharing;
      setIsSharing(currentlySharing);
      if (currentlySharing && simpleScreenShare.userId) {
        setSharingUser(simpleScreenShare.userId);
      }
    } catch {}
  };

  const handleStartShare = async () => {
    if (someoneElseSharing) {
      setError("Someone is already sharing.");
      return;
    }

    setIsLoading(true);
    try {
      const success = await simpleScreenShare.startScreenShare();
      if (success) {
        setIsSharing(true);
        setSharingUser(userId);
      } else {
        setError("Failed to start screen sharing");
      }
    } catch (error) {
      console.error("Failed to start screen share:", error);
      setError(error.message || "Failed to start screen sharing");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopShare = () => {
    simpleScreenShare.stopScreenShare();
    setIsSharing(false);
    setSharingUser(null);
  };

  useEffect(() => {
    if (receivedStream && imageRef.current) {
      imageRef.current.src = receivedStream.imageData;
      imageRef.current.onload = () => {};
      imageRef.current.onerror = (error) => {
        console.error("Error loading image:", error);
      };
    }
  }, [receivedStream]);

return (
  <div className="simple-screen-share">
    {/* Header selalu tampil */}
    <div className="screen-share-header">
      <h3>Screen Share</h3>
      <div className="screen-share-controls">
        {isSharing ? (
          <button onClick={handleStopShare} className="btn btn-danger">
            Stop Share
          </button>
        ) : someoneElseSharing ? (
          <button className="btn" disabled title="Someone is already sharing">
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

        {/* Tombol annotate – hanya muncul kalau aku yang share */}
        {String(sharingUser) === String(userId) && isSharing && (
          <button
            onClick={() => setIsAnnotating(!isAnnotating)}
            className={`btn ${isAnnotating ? "btn-warning" : "btn-secondary"}`}
            style={{ marginLeft: "8px" }}
          >
            {isAnnotating ? "Stop Annotate" : "Start Annotate"}
          </button>
        )}
      </div>
    </div>

    {/* Konten share */}
    <div className="screen-share-content">
      {(receivedStream || (isSharing && String(sharingUser) === String(userId))) ? (
        <div className="received-screen-share">
          <div className="share-info">
            <span className="live-indicator">🔴 LIVE</span>
            <span>
              {String(sharingUser) === String(userId)
                ? "You are sharing"
                : `Sharing: ${sharingUser}`}
            </span>
          </div>

          <div className="video-container" ref={overlayRef} style={{ position: "relative" }}>
            {String(sharingUser) === String(userId) ? (
              // Placeholder kalau aku yang share
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "#111",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <p>🔴 You are sharing your screen</p>
              </div>
            ) : (
              // Kalau orang lain yang share
              <img
                ref={imageRef}
                className="screen-share-image"
                alt="Screen Share"
              />
            )}

            {/* Render annotate overlay hanya untuk sharer */}
            {isAnnotating && String(sharingUser) === String(userId) && (
              <AnnotateZoomCanvas
                attachTo={overlayRef}
                onClose={() => setIsAnnotating(false)}
              />
            )}
          </div>
        </div>
      ) : (
        // Kalau tidak ada share
        <div className="no-screen-share">
          <div className="empty-state">
            <div className="empty-icon">📺</div>
            <p>No screen share active</p>
            <small>Start sharing to see your screen here</small>
          </div>
        </div>
      )}
    </div>
  </div>
);
};
export default SimpleScreenShare;
