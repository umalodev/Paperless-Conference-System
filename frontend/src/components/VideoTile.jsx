// src/components/VideoTile.jsx
import React, { useRef, useEffect, useState } from "react";
import "./VideoTile.css";

const VideoTile = ({
  label = "User",
  stream,
  muted = false,
  micOn = true,
  camOn = true,
  className = "",
  onVideoError,
}) => {
  const videoRef = useRef(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasVideoTrack, setHasVideoTrack] = useState(false);
  const [hasAudioTrack, setHasAudioTrack] = useState(false);
  const [videoError, setVideoError] = useState(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    console.log(`Setting stream for ${label}:`, {
      streamId: stream.id,
      tracks: stream
        .getTracks()
        .map((t) => ({ kind: t.kind, enabled: t.enabled })),
    });

    // Check what tracks are available
    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();

    setHasVideoTrack(videoTracks.length > 0);
    setHasAudioTrack(audioTracks.length > 0);

    // Set the stream to the video element
    video.srcObject = stream;
    video.muted = muted; // Prevent echo for local streams

    const handleLoadedMetadata = () => {
      console.log(`Video metadata loaded for ${label}`);
      setIsVideoLoaded(true);
      setVideoError(null);
    };

    const handleLoadedData = () => {
      console.log(`Video data loaded for ${label}`);
      video.play().catch((err) => {
        console.warn(`Auto-play failed for ${label}:`, err);
        // Auto-play failed, but that's often expected
      });
    };

    const handleError = (error) => {
      console.error(`Video error for ${label}:`, error);
      setVideoError(error);
      setIsVideoLoaded(false);
      onVideoError?.(error);
    };

    const handleCanPlay = () => {
      console.log(`Video can play for ${label}`);
      setIsVideoLoaded(true);
    };

    // Add event listeners
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("error", handleError);
    video.addEventListener("canplay", handleCanPlay);

    // Track changes
    const handleTrackChange = () => {
      const newVideoTracks = stream.getVideoTracks();
      const newAudioTracks = stream.getAudioTracks();

      setHasVideoTrack(newVideoTracks.length > 0);
      setHasAudioTrack(newAudioTracks.length > 0);

      console.log(`Track change for ${label}:`, {
        video: newVideoTracks.length,
        audio: newAudioTracks.length,
      });
    };

    // Listen to track events
    stream.addEventListener("addtrack", handleTrackChange);
    stream.addEventListener("removetrack", handleTrackChange);

    // Monitor track enabled state
    const monitorTracks = () => {
      videoTracks.forEach((track) => {
        track.addEventListener("ended", () => {
          console.log(`Video track ended for ${label}`);
          setHasVideoTrack(false);
        });
      });

      audioTracks.forEach((track) => {
        track.addEventListener("ended", () => {
          console.log(`Audio track ended for ${label}`);
          setHasAudioTrack(false);
        });
      });
    };

    monitorTracks();

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("error", handleError);
      video.removeEventListener("canplay", handleCanPlay);

      stream.removeEventListener("addtrack", handleTrackChange);
      stream.removeEventListener("removetrack", handleTrackChange);

      // Don't set srcObject to null here as it might be used by other components
      console.log(`Cleaned up video tile for ${label}`);
    };
  }, [stream, label, muted, onVideoError]);

  // Generate initials for avatar
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const showVideo =
    stream && hasVideoTrack && camOn && isVideoLoaded && !videoError;
  const showAudioIndicator = hasAudioTrack;

  return (
    <div className={`video-tile ${className}`}>
      <div className="video-container">
        {showVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            className="video-element"
          />
        ) : (
          <div className="video-placeholder">
            <div className="avatar-circle">
              <span className="avatar-initials">{getInitials(label)}</span>
            </div>
            {!camOn && (
              <div className="camera-off-indicator">
                <span>📷</span>
                <span className="camera-off-text">Camera Off</span>
              </div>
            )}
            {videoError && (
              <div className="video-error">
                <span>⚠️</span>
                <span className="error-text">Video Error</span>
              </div>
            )}
          </div>
        )}

        {/* Overlay information */}
        <div className="video-overlay">
          <div className="participant-info">
            <span className="participant-name">{label}</span>
            <div className="media-indicators">
              {showAudioIndicator && (
                <span className={`mic-indicator ${micOn ? "on" : "off"}`}>
                  {micOn ? "🎤" : "🔇"}
                </span>
              )}
              {hasVideoTrack && (
                <span className={`cam-indicator ${camOn ? "on" : "off"}`}>
                  {camOn ? "📹" : "📷"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoTile;
