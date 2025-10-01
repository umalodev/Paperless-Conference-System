import React, { useState, useEffect, useRef } from "react";
import simpleScreenShare from "../services/simpleScreenShare";
import "./SimpleScreenShare.css";
import AnnotateZoomCanvas from "./AnnotateZoomCanvas";

const SimpleScreenShare = ({
  meetingId,
  userId,
  isSharing: externalIsSharing,
  onSharingChange: externalOnSharingChange,
  onError: externalOnError,
  isAnnotating,
  setIsAnnotating,
  sharingUser,         // ⬅️ ambil dari parent
  setSharingUser,      // ⬅️ update dari parent
  setScreenShareOn,
}) => {
  
  const [internalIsSharing, setInternalIsSharing] = useState(false);
  const [receivedStream, setReceivedStream] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const imageRef = useRef(null);
  const overlayRef = useRef(null);

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
      setScreenShareOn(true);
      if (String(data.userId) === String(userId)) {
        setIsSharing(true);
      }
      if (originalOnStart) originalOnStart(data);
    };

    simpleScreenShare.onScreenShareStop = (data) => {
      setSharingUser(null);
      setScreenShareOn(false);
      setIsAnnotating(false); // otomatis matikan annotate
      setReceivedStream(null);
      if (String(data.userId) === String(userId)) {
        setIsSharing(false);
        setIsAnnotating(false); // matikan annotate otomatis
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
      setScreenShareOn(true); // ⬅️ tambahin ini biar parent tau
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
    setIsAnnotating(false); // matikan annotate otomatis
  };

  useEffect(() => {
    if (receivedStream && imageRef.current) {
      imageRef.current.src = receivedStream.imageData;
    }
  }, [receivedStream]);

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
        {(receivedStream ||
          (isSharing && String(sharingUser) === String(userId))) ? (
          <div className="received-screen-share">
            <div className="share-info">
              <span className="live-indicator">🔴 LIVE</span>
              <span>
                {String(sharingUser) === String(userId)
                  ? "You are sharing"
                  : `Sharing: ${sharingUser}`}
              </span>
            </div>

            <div className="video-container" ref={overlayRef}>
              {String(sharingUser) === String(userId) ? (
                <div className="sharing-placeholder">
                  <p>🔴 You are sharing your screen</p>
                </div>
              ) : (
                <img ref={imageRef} alt="Screen Share" />
              )}

              {isAnnotating && String(sharingUser) === String(userId) && (
                <AnnotateZoomCanvas
                  global={true}
                  onClose={() => setIsAnnotating(false)}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="no-screen-share">
            <p>No screen share active</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleScreenShare;
