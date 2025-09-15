import React, { useState, useEffect, useRef } from "react";
import simpleScreenShare from "../services/simpleScreenShare";
import "./SimpleScreenShare.css";

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

  const videoRef = useRef(null);
  const imageRef = useRef(null);

  // pakai state eksternal kalau ada
  const isSharing =
    externalIsSharing !== undefined ? externalIsSharing : internalIsSharing;
  const setIsSharing = externalOnSharingChange || setInternalIsSharing;
  const setError = externalOnError || (() => {});

  // 👉 flag: ada orang lain yang sedang share?
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
    return () => {
      // jangan cleanup total (footer mungkin butuh), biarkan service yang atur siklus
    };
  }, [meetingId, userId]);

  const setupEventListeners = () => {
    const originalOnStart = simpleScreenShare.onScreenShareStart;
    const originalOnStop = simpleScreenShare.onScreenShareStop;
    const originalOnReceived = simpleScreenShare.onScreenShareReceived;

    simpleScreenShare.onScreenShareStart = (data) => {
      // ketika siapapun mulai share
      setSharingUser(data.userId);
      if (String(data.userId) === String(userId)) {
        setIsSharing(true);
      }
      if (originalOnStart) originalOnStart(data);
    };

    simpleScreenShare.onScreenShareStop = (data) => {
      // ketika siapapun berhenti
      setSharingUser(null);
      setReceivedStream(null);
      if (String(data.userId) === String(userId)) {
        setIsSharing(false);
      }
      if (originalOnStop) originalOnStop(data);
    };

    simpleScreenShare.onScreenShareReceived = (data) => {
      // frame masuk dari yang sharing (bisa aku atau orang lain)
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
      // jika aku yang sharing, tandai aku; kalau orang lain, sharingUser akan di-set saat event/first frame masuk
      if (currentlySharing && simpleScreenShare.userId) {
        setSharingUser(simpleScreenShare.userId);
      }
    } catch {}
  };

  const handleStartShare = async () => {
    // ⛔ cegah start kalau ada orang lain yang sedang share
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
      <div className="screen-share-header">
        <h3>Screen Share</h3>
        <div className="screen-share-controls">
          {/* Rules tombol:
              - Aku sharing -> tampil Stop
              - Orang lain sharing -> Start disabled (atau bisa disembunyikan)
              - Tidak ada yang sharing -> Start enabled
          */}
          {isSharing ? (
            <button onClick={handleStopShare} className="btn btn-danger">
              Stop Share
            </button>
          ) : someoneElseSharing ? (
            // Versi DISABLE. Kalau mau sembunyikan, ganti blok ini dengan null.
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
        </div>
      </div>

      <div className="screen-share-content">
        {receivedStream ? (
          <div className="received-screen-share">
            <div className="share-info">
              <span className="live-indicator">🔴 LIVE</span>
              <span>
                {String(sharingUser) === String(userId)
                  ? "You are sharing"
                  : `Sharing: ${sharingUser}`}
              </span>
            </div>
            <div className="video-container">
              <img
                ref={imageRef}
                className="screen-share-image"
                alt="Screen Share"
              />
            </div>
          </div>
        ) : (
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
