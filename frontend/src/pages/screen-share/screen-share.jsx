import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import mediaSoapService from "../../services/mediaSoapService";
import "./screen-share.css";

const ScreenShare = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [activeTab, setActiveTab] = useState("people");
  const [screenShareStatus, setScreenShareStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMediaSoupConnected, setIsMediaSoupConnected] = useState(false);
  const [mediaSoupStatus, setMediaSoupStatus] = useState("Connecting...");

  const videoRef = useRef(null);
  const screenRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  useEffect(() => {
    // Debug: Check if we're in Electron and API availability
    console.log("=== SCREEN SHARE COMPONENT MOUNTED ===");
    console.log("navigator.userAgent:", navigator.userAgent);
    console.log("window.electronAPI available:", !!window.electronAPI);

    if (window.screenAPI) {
      console.log("screenAPI object:", window.screenAPI);
      console.log("screenAPI.isElectron:", window.screenAPI.isElectron);
      console.log(
        "screenAPI.getScreenSources available:",
        !!window.screenAPI.getScreenSources
      );
    } else {
      console.warn("window.screenAPI is NOT available!");
      console.log(
        "Available window properties:",
        Object.keys(window).filter(
          (key) => key.includes("screen") || key.includes("electron")
        )
      );
    }
    // Get user data from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const userInfo = JSON.parse(userData);
        setUser(userInfo);
      } catch (error) {
        console.error("Error parsing user data:", error);
        navigate("/");
      }
    } else {
      navigate("/");
    }

    // Initialize participants
    setParticipants([
      {
        id: 1,
        name: "A Alice Johnson",
        role: "participant",
        isMuted: false,
        isVideoOff: false,
      },
      {
        id: 2,
        name: "B Bob Smith",
        role: "participant",
        isMuted: true,
        isVideoOff: false,
      },
      {
        id: 3,
        name: "C Carol Wilson",
        role: "participant",
        isMuted: false,
        isVideoOff: true,
      },
      {
        id: 4,
        name: "R Rohit Panjaitan",
        role: "host",
        isMuted: false,
        isVideoOff: false,
      },
    ]);

    // Initialize MediaSoup connection
    const initializeMediaSoup = async () => {
      try {
        setMediaSoupStatus("Initializing MediaSoup...");
        const meetingId = userData
          ? JSON.parse(userData).id || "default-meeting"
          : "default-meeting";

        // Try to connect to MediaSoup server
        try {
          await mediaSoapService.initialize(meetingId, true);

          // Set up MediaSoup event handlers
          mediaSoapService.onParticipantUpdate((event, data) => {
            console.log("Participant update:", event, data);
            // Update participants list if needed
          });

          mediaSoapService.onTrack((producerId, stream) => {
            console.log("New track received:", producerId, stream);
            // Handle incoming media streams
          });

          setIsMediaSoupConnected(true);
          setMediaSoupStatus("Connected to MediaSoup");
          console.log("MediaSoup initialized successfully");
        } catch (mediaSoupError) {
          console.warn(
            "MediaSoup connection failed, continuing without it:",
            mediaSoupError
          );
          setMediaSoupStatus("MediaSoup unavailable - local mode only");
          setIsMediaSoupConnected(false);
          // Continue without MediaSoup - local screen sharing will still work
        }
      } catch (error) {
        console.error("Failed to initialize MediaSoup:", error);
        setMediaSoupStatus("MediaSoup connection failed");
        setIsMediaSoupConnected(false);
      }
    };

    initializeMediaSoup();
  }, [navigate]);

  const handleEndMeeting = () => {
    // Stop all media streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Disconnect from MediaSoup
    if (isMediaSoupConnected) {
      try {
        mediaSoapService.disconnect();
        console.log("Disconnected from MediaSoup");
      } catch (error) {
        console.error("Failed to disconnect from MediaSoup:", error);
      }
    }

    navigate("/dashboard");
  };

  const toggleAudio = async () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const newAudioState = !isAudioOn;
        audioTrack.enabled = newAudioState;
        setIsAudioOn(newAudioState);
        console.log(`Audio ${newAudioState ? "enabled" : "disabled"}`);
      }
    }
  };

  const toggleVideo = async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        const newVideoState = !isVideoOn;
        videoTrack.enabled = newVideoState;
        setIsVideoOn(newVideoState);
        console.log(`Video ${newVideoState ? "enabled" : "disabled"}`);
      }
    }
  };

  const startScreenShare = async () => {
    setIsLoading(true);
    setScreenShareStatus("Starting screen share...");

    try {
      const canUseElectronScreenAPI =
        !!(window.screenAPI && typeof window.screenAPI.getScreenSources === "function");
      const hasNativeDisplayCapture =
        typeof navigator.mediaDevices?.getDisplayMedia === "function";

      let stream;

      // Prefer the native Display Capture API when available (works in Electron too)
      if (hasNativeDisplayCapture) {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: 30 },
            audio: false,
          });
        } catch (eNative) {
          // Retry with broader constraints
          if (eNative && eNative.name === "NotSupportedError") {
            try {
              stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false,
              });
            } catch (eNative2) {
              if (eNative2 && eNative2.name !== "NotSupportedError") {
                throw eNative2;
              }
            }
          } else {
            throw eNative;
          }
        }
      } else if (canUseElectronScreenAPI) {
        // 1) Get list of sources
        const sources = await window.screenAPI.getScreenSources();
        if (!sources?.length) {
          throw new Error("No screen/window sources found");
        }

        // 2) Pick the entire screen if available
        const pick =
          sources.find((s) => s.id.startsWith("screen:")) || sources[0];

        // 3) Try Electron-specific getUserMedia first; if it fails, fallback to getDisplayMedia
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              // @ts-ignore Electron/Chromium specific constraints
              chromeMediaSource: "desktop",
              // @ts-ignore Electron/Chromium specific constraints
              chromeMediaSourceId: pick.id,
              frameRate: { max: 30 },
              width: { max: window.screen.width },
              height: { max: window.screen.height },
            },
          });
        } catch (eDesktop) {
          console.warn("Desktop capture via getUserMedia failed, retrying with getDisplayMedia:", eDesktop);
          // Some Electron/Chromium combos accept getDisplayMedia directly
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false,
          });
        }
      } else {
        // Browser/Electron modern API: prefer minimal constraints for compatibility
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: 30 },
            audio: false,
          });
        } catch (e1) {
          if (e1 && e1.name === "NotSupportedError") {
            try {
              // Retry with the most permissive shape supported widely
              stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false,
              });
            } catch (e2) {
              if (e2 && e2.name === "NotSupportedError") {
                // Final attempt: no constraints at all
                stream = await navigator.mediaDevices.getDisplayMedia();
              } else {
                throw e2;
              }
            }
          } else {
            throw e1;
          }
        }
      }

      // Handle stream setup
      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      setScreenShareStatus("Screen sharing active");
      setIsLoading(false);

      if (screenRef.current) {
        screenRef.current.srcObject = stream;
        screenRef.current.onloadedmetadata = () => {
          screenRef.current
            .play()
            .catch((e) => console.error("Auto-play failed:", e));
        };
      }

      // Handle stream end
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          console.log("Screen sharing ended by user");
          stopScreenShare();
        };
      }

      // Send to MediaSoup if connected
      if (isMediaSoupConnected) {
        await mediaSoapService.startScreenShare();
      }
    } catch (error) {
      setIsLoading(false);
      setScreenShareStatus("Screen sharing failed");
      console.error("Error starting screen share:", error);

      // Handle specific errors
      if (error.name === "NotAllowedError") {
        alert("Screen sharing permission denied. Please allow screen sharing.");
      } else if (String(error.message || "").includes("screenAPI.getScreenSources")) {
        alert(
          "Screen sharing API not available. Please check Electron configuration."
        );
      } else if (error.name === "NotSupportedError") {
        alert("Display capture is not supported with the requested constraints.");
      } else {
        alert(`Screen sharing failed: ${error.message || "Unknown error"}`);
      }
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    setScreenShareStatus("");

    if (screenRef.current) {
      screenRef.current.srcObject = null;
    }

    // Stop MediaSoup screen share if connected
    if (isMediaSoupConnected) {
      try {
        mediaSoapService.stopScreenShare();
        console.log("MediaSoup screen share stopped");
      } catch (error) {
        console.error("Failed to stop MediaSoup screen share:", error);
      }
    }

    console.log("Screen sharing stopped");
  };

  const startLocalMedia = async () => {
    try {
      // Request camera and microphone access directly
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      setIsVideoOn(true);
      setIsAudioOn(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      console.log("Local media started successfully");
    } catch (error) {
      console.error("Error starting local media:", error);
      alert("Failed to access camera/microphone. Please check permissions.");
    }
  };

  useEffect(() => {
    // Start local media when component mounts
    startLocalMedia();

    return () => {
      // Cleanup media streams when component unmounts
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Debug useEffect for screen sharing state
  useEffect(() => {
    console.log("isScreenSharing changed:", isScreenSharing);
    console.log("screenRef.current:", screenRef.current);
    console.log("screenStreamRef.current:", screenStreamRef.current);
  }, [isScreenSharing]);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="conference-container">
      {/* Top Header */}
      <header className="conference-header">
        <div className="header-left">
          <h1 className="conference-title">Conference Meeting</h1>
          <div className="meeting-info">
            <span className="host-badge">Host</span>
            <span className="meeting-id">ID: abcdefg</span>
          </div>
        </div>
        <button onClick={handleEndMeeting} className="end-meeting-btn">
          <span className="end-icon">📞</span>
          End Meeting
        </button>
      </header>

      {/* Main Content Area */}
      <div className="conference-main">
        <div className="main-content">
          {console.log(
            "Rendering main content, isScreenSharing:",
            isScreenSharing
          )}

          {/* Debug info */}
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              background: "rgba(0,0,0,0.8)",
              color: "white",
              padding: "10px",
              borderRadius: "5px",
              fontSize: "12px",
              zIndex: 1000,
            }}
          >
            Debug: isScreenSharing = {String(isScreenSharing)}
            <br />
            screenRef exists: {String(!!screenRef.current)}
            <br />
            stream exists: {String(!!screenStreamRef.current)}
          </div>

          {isScreenSharing ? (
            <div className="screen-share-container">
              <video
                ref={screenRef}
                autoPlay
                playsInline
                className="screen-video"
                controls
                key="screen-video"
              />
              <div className="screen-share-info">
                <span className="status-badge active">
                  ● Live Screen Sharing
                </span>
              </div>
            </div>
          ) : (
            <div className="no-screen-share">
              <div className="monitor-icon">🖥️</div>
              <h2>No Screen Share</h2>
              <p>Click 'Share Screen' to start presenting</p>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="conference-sidebar">
          {/* Tabs */}
          <div className="sidebar-tabs">
            <button
              className={`tab ${activeTab === "people" ? "active" : ""}`}
              onClick={() => setActiveTab("people")}
            >
              People
            </button>
            <button
              className={`tab ${activeTab === "files" ? "active" : ""}`}
              onClick={() => setActiveTab("files")}
            >
              Files
            </button>
            <button
              className={`tab ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              Chat
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === "people" && (
              <div className="participants-section">
                <h3>Participants ({participants.length})</h3>
                <div className="participants-list">
                  {participants.map((participant) => (
                    <div key={participant.id} className="participant-item">
                      <span className="participant-name">
                        {participant.name}
                      </span>
                      <div className="participant-status">
                        {participant.isMuted && (
                          <span className="muted-icon">🔇</span>
                        )}
                        {participant.isVideoOff && (
                          <span className="video-off-icon">📹</span>
                        )}
                        {participant.role === "host" && (
                          <span className="host-tag">Host</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "files" && (
              <div className="files-section">
                <h3>Shared Files</h3>
                <p>No files shared yet</p>
              </div>
            )}

            {activeTab === "chat" && (
              <div className="chat-section">
                <h3>Meeting Chat</h3>
                <p>No messages yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="control-bar">
        <button
          onClick={toggleAudio}
          className={`control-btn ${!isAudioOn ? "muted" : ""}`}
        >
          {isAudioOn ? "🎤" : "🔇"}
        </button>

        <button
          onClick={toggleVideo}
          className={`control-btn ${!isVideoOn ? "muted" : ""}`}
        >
          {isVideoOn ? "📹" : "📷"}
        </button>

        <button
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
          className={`control-btn primary ${isScreenSharing ? "sharing" : ""} ${
            isLoading ? "loading" : ""
          }`}
          title={
            isScreenSharing
              ? "Click to stop screen sharing"
              : "Click to start screen sharing"
          }
          disabled={isLoading}
        >
          {isLoading
            ? "⏳ Starting..."
            : isScreenSharing
            ? "🖥️ Stop Sharing"
            : "🖥️ Share Screen"}
        </button>

        <button className="control-btn primary">✏️ Annotate</button>

        {/* MediaSoup Connection Status */}
        <div className="mediasoup-status">
          <span
            className={`status-dot ${
              isMediaSoupConnected ? "connected" : "disconnected"
            }`}
          >
            ●
          </span>
          <span className="status-text">
            {isMediaSoupConnected ? "MediaSoup" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Screen Share Status */}
      {screenShareStatus && (
        <div className="screen-share-status">
          <span
            className={`status-indicator ${
              isScreenSharing ? "active" : "error"
            }`}
          >
            {isScreenSharing ? "●" : "●"}
          </span>
          {screenShareStatus}
        </div>
      )}

      {/* MediaSoup Status */}
      {mediaSoupStatus && (
        <div className="mediasoup-status-bar">
          <span
            className={`status-dot ${
              isMediaSoupConnected ? "connected" : "disconnected"
            }`}
          >
            ●
          </span>
          <span className="status-text">{mediaSoupStatus}</span>
        </div>
      )}

      {/* Local Video Preview */}
      <div className="local-video-preview">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="local-video"
        />
      </div>
    </div>
  );
};

export default ScreenShare;
