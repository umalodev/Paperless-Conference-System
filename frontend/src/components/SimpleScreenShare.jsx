import React, { useState, useEffect, useRef } from "react";
import simpleScreenShare from "../services/simpleScreenShare";
import "./SimpleScreenShare.css";
import AnnotateZoomCanvas from "./AnnotateZoomCanvas";
import { useScreenShare } from "../contexts/ScreenShareContext";

const SimpleScreenShare = ({ meetingId, userId }) => {
  const [internalIsSharing, setInternalIsSharing] = useState(false);
  const [receivedStream, setReceivedStream] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const imageRef = useRef(null);
  const overlayRef = useRef(null);

  // 🔹 ambil dari context global
  const {
    sharingUser,
    setSharingUser,
    screenShareOn,
    setScreenShareOn,
    isAnnotating,
    setIsAnnotating,
  } = useScreenShare();

  const isSharing = screenShareOn && String(sharingUser) === String(userId);
  const someoneElseSharing =
    Boolean(sharingUser) && String(sharingUser) !== String(userId);

  useEffect(() => {
    if (meetingId && userId) {
      initializeScreenShare();
    }
    return () => {};
  }, [meetingId, userId]);

  const setupEventListeners = () => {
    simpleScreenShare.onScreenShareStart = (data) => {
      setSharingUser(data.userId);
      setScreenShareOn(true);
      if (String(data.userId) === String(userId)) {
        setInternalIsSharing(true);
      }
    };

    simpleScreenShare.onScreenShareStop = (data) => {
      setSharingUser(null);
      setScreenShareOn(false);
      setIsAnnotating(false);
      setReceivedStream(null);
      if (String(data.userId) === String(userId)) {
        setInternalIsSharing(false);
      }
    };

    simpleScreenShare.onScreenShareReceived = (data) => {
      setReceivedStream({ ...data, timestamp: Date.now() });
      setSharingUser(data.userId);
    };
  };

  const initializeScreenShare = async () => {
    await simpleScreenShare.initialize(meetingId, userId);
    setupEventListeners();
  };

  const handleStartShare = async () => {
    if (someoneElseSharing) return;
    setIsLoading(true);
    try {
      const success = await simpleScreenShare.startScreenShare();
      if (success) {
        setSharingUser(userId);
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

            <div className="video-container" ref={overlayRef}>
              {String(sharingUser) === String(userId) ? (
                <div className="sharing-placeholder">
                  <p>🔴 You are sharing your screen</p>
                </div>
              ) : (
                <img
                  ref={imageRef}
                  alt="Screen Share"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain", 
                    background: "#000",
                  }}
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
