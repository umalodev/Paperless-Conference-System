// src/components/MeetingFooter.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "./Icon.jsx";
import meetingService from "../services/meetingService.js";
import { useMediaRoom } from "../contexts/MediaRoomContext.jsx";
import { useScreenShare } from "../contexts/ScreenShareContext";
import "./meeting-footer.css";
import { useModal } from "../contexts/ModalProvider.jsx";

export default function MeetingFFooter({
  userRole = "participant",
  onEndMeeting,
  onLeaveMeeting,
  onMenuClick,
  onHelpClick,
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm, notify } = useModal();
  const mediaRoom = useMediaRoom?.() || null;
  const stopMicCtx = mediaRoom?.stopMic;
  const stopCamCtx = mediaRoom?.stopCam;

  // 🔹 Ambil state global screen share
  const { sharingUser, screenShareOn, isAnnotating, setIsAnnotating } =
    useScreenShare();

  const currentUserId = (() => {
    try {
      const rawUser = localStorage.getItem("user");
      const u = rawUser ? JSON.parse(rawUser) : null;
      return u?.id || u?._id || u?.userId || null;
    } catch {
      return null;
    }
  })();

  // Helpers
  const getCurrentMeeting = () => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const cm = getCurrentMeeting();
  const getMeetingId = (cm) => cm?.meetingId || cm?.id || cm?.code;
  const meetingId = getMeetingId(cm);

  const isHost = userRole === "host" || userRole === "admin";
  const isDefaultMeeting =
    Boolean(cm?.isDefault) || String(meetingId) === "1000";
  // Matikan semua track dalam sebuah stream
  const stopTracks = (stream) => {
    if (!stream) return;
    try {
      const tracks = [
        ...(stream.getAudioTracks?.() || []),
        ...(stream.getVideoTracks?.() || []),
      ];
      tracks.forEach((t) => {
        try {
          t.stop?.();
        } catch {}
        try {
          t.enabled = false;
        } catch {}
      });
    } catch {}
  };

  // Kosongkan semua <video> element yang mungkin masih terpasang
  const detachAllVideoElements = () => {
    try {
      const vids = document.querySelectorAll("video");
      vids.forEach((v) => {
        try {
          v.srcObject = null;
        } catch {}
        try {
          v.pause?.();
        } catch {}
        try {
          v.removeAttribute("src");
        } catch {}
      });
    } catch {}
  };

  // Tutup semua koneksi WebRTC / mediasoup yang mungkin ada
  const closeRealtimeTransports = async () => {
    try {
      // Mediasoup (jika kamu simpan di window.*)
      const ms = window.mediasoupRoom || window.mediaRoom || window.msRoom;
      if (ms) {
        // Tutup producers
        try {
          (ms.producers || []).forEach((p) => {
            try {
              p.close?.();
            } catch {}
          });
        } catch {}
        // Tutup consumers
        try {
          (ms.consumers || []).forEach((c) => {
            try {
              c.close?.();
            } catch {}
          });
        } catch {}
        // Tutup transports
        try {
          (ms.transports || []).forEach((t) => {
            try {
              t.close?.();
            } catch {}
          });
        } catch {}
        // Leave/close room
        try {
          ms.leave?.();
        } catch {}
        try {
          ms.close?.();
        } catch {}
      }

      // PeerConnection vanilla WebRTC
      const pcs = [
        window.rtcPeerConnection,
        ...(window.peerConnections || []),
      ].filter(Boolean);
      pcs.forEach((pc) => {
        try {
          pc.getSenders?.().forEach((s) => {
            try {
              s.track?.stop?.();
            } catch {}
          });
        } catch {}
        try {
          pc.getReceivers?.().forEach((r) => {
            try {
              r.track?.stop?.();
            } catch {}
          });
        } catch {}
        try {
          pc.close?.();
        } catch {}
      });
      window.peerConnections = [];
      window.rtcPeerConnection = undefined;
    } catch {}
  };

  // Matikan semua mic/cam streams yang umum dipakai
  const cleanupMediaDevices = () => {
    try {
      stopTracks(window.localStream);
      stopTracks(window.localVideoStream);
      stopTracks(window.localAudioStream);
      stopTracks(window.currentMicStream);
      stopTracks(window.currentCamStream);
      // beberapa implementasi menyimpan langsung di element
      stopTracks(document.getElementById("localVideo")?.srcObject);
      stopTracks(document.getElementById("localAudio")?.srcObject);
    } catch {}
    detachAllVideoElements();
  };

  // Matikan screen share kalau belum dimatikan
  const stopScreenShareIfAny = () => {
    try {
      if (window.simpleScreenShare?.isSharing)
        window.simpleScreenShare.stopScreenShare();
    } catch {}
    try {
      stopTracks(window.screenShareStream);
    } catch {}
  };

  // Panggil semua cleanup realtime + media
  const cleanupAllMediaAndRealtime = async () => {
    try {
      stopScreenShareIfAny();
      cleanupMediaDevices();
      await closeRealtimeTransports();
    } catch {}
  };

  // Common cleanup
  const cleanupRealtime = () => {
    try {
      if (window.simpleScreenShare?.isSharing) {
        window.simpleScreenShare.stopScreenShare();
      }
    } catch {}
    try {
      if (window.meetingWebSocket) {
        window.meetingWebSocket.close();
      }
    } catch {}
  };

  // =========================================================
  // 🏠 Default Back to Home (cleanup + conditional disconnect)
  // =========================================================
  const defaultBack = async () => {
    try {
      // 1) Matikan media dan koneksi realtime
      await cleanupAllMediaAndRealtime();

      // 2) Putuskan control server untuk participant
      if (!isHost) {
        try {
          if (window.electronAPI?.disconnectFromControlServer) {
            console.log(
              "🔌 [Participant] Disconnecting from Control Server (Home button)..."
            );
            window.electronAPI.disconnectFromControlServer();
          }
        } catch (err) {
          console.warn("⚠️ Failed to disconnect Control Server:", err);
        }

        if (meetingId) {
          try {
            await meetingService.leaveMeeting(meetingId);
          } catch {}
        }
      } else {
        console.log(
          "ℹ️ Host navigates home — server session may stay, but local media is off."
        );
      }

      // 3) Sinkronkan UI toggle agar ikon jadi OFF
      try {
        await stopMicCtx?.();
      } catch {}
      try {
        await stopCamCtx?.();
      } catch {}
    } catch (err) {
      console.error("⚠️ Error during back/cleanup:", err);
    } finally {
      localStorage.removeItem("currentMeeting");
      navigate(isHost ? "/setup" : "/start");
    }
  };

  const defaultEndMeeting = async () => {
    const ok = await confirm({
      title: "End this meeting?",
      message:
        "All participants will be disconnected. This action cannot be undone.",
      destructive: true,
      okText: "End Meeting",
      cancelText: "Cancel",
      onConfirm: async () => {
        if (!meetingId) throw new Error("Meeting ID not found.");
        await cleanupAllMediaAndRealtime();
        try {
          await meetingService.endMeeting(meetingId);
        } catch (e) {
          // BE bisa jadi sudah berhasil mengubah status, tapi balas 500 karena hal lain.
          console.warn("endMeeting failed, forcing client exit anyway:", e);
        }
      },
    });

    if (ok) {
      try {
        await stopMicCtx?.();
      } catch {}
      try {
        await stopCamCtx?.();
      } catch {}
      localStorage.removeItem("currentMeeting");
      await notify({
        variant: "success",
        title: "Meeting Ended",
        message: "The meeting has been ended successfully.",
        autoCloseMs: 1000,
      });
      navigate("/setup");
    }
  };

  const defaultLeaveMeeting = async () => {
    const ok = await confirm({
      title: "Leave this meeting?",
      message: "You will disconnect from this session.",
      okText: "Leave",
      cancelText: "Stay",
      onConfirm: async () => {
        if (!meetingId) throw new Error("Meeting ID not found.");
        await cleanupAllMediaAndRealtime();
        await meetingService.leaveMeeting(meetingId);
      },
    });

    if (ok) {
      try {
        onToggleMic?.(false);
      } catch {}
      try {
        onToggleCam?.(false);
      } catch {}
      localStorage.removeItem("currentMeeting");
      await notify({
        variant: "info",
        title: "Left Meeting",
        message: "You have left the meeting.",
        autoCloseMs: 900,
      });
      navigate("/start");
    }
  };

  const handleEnd = onEndMeeting || defaultEndMeeting;
  const handleLeave = onLeaveMeeting || defaultLeaveMeeting;
  const handleBack = defaultBack;
  const handleMenu = onMenuClick || (() => navigate("/participant/dashboard"));
  const handleHelp = onHelpClick || (() => alert("Need help?"));

  const showBackButton = !isHost || (isHost && isDefaultMeeting);
  const showEndButton = isHost && !isDefaultMeeting;

  return (
    <footer className="pd-bottombar">
      {/* 🔹 Left Control Group (Mic / Camera) */}
      <div className="pd-controls-left">
        <button
          className={`pd-ctrl ${micOn === false ? "is-off" : ""}`}
          title={micOn === false ? "Mic Off" : "Mic On"}
          onClick={onToggleMic}
        >
          {micOn === false ? (
            <img
              src="/img/mute.png"
              alt="Mic Off"
              style={{ width: "20px", height: "20px" }}
            />
          ) : (
            <Icon slug="mic" />
          )}
        </button>

        <button
          className={`pd-ctrl ${camOn === false ? "is-off" : ""}`}
          title={camOn === false ? "Camera Off" : "Camera On"}
          onClick={onToggleCam}
        >
          {camOn === false ? (
            <img
              src="/img/offcam.png"
              alt="Camera Off"
              style={{ width: "20px", height: "20px" }}
            />
          ) : (
            <Icon slug="camera" />
          )}
        </button>
      </div>

      <div className="pd-controls-right">
        {/* 🟩 Screen Share Button (dengan badge) */}
        <button
          className="pd-ctrl"
          title="Screen Share"
          onClick={() => navigate("/menu/screenshare")}
          style={{ position: "relative" }}
        >
          <Icon slug="screen-share" />

          {/* 🔴 Badge jika ada orang lain share */}
          {screenShareOn && String(sharingUser) !== String(currentUserId) && (
            <>
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "red",
                  boxShadow: "0 0 6px rgba(0,0,0,0.4)",
                }}
              />
              {location.pathname !== "/menu/screenshare" && (
                <div
                  style={{
                    position: "absolute",
                    top: -36,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "red",
                    color: "white",
                    fontSize: 12,
                    padding: "4px 8px",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                  }}
                >
                  Someone is sharing
                  <div
                    style={{
                      position: "absolute",
                      bottom: -6,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 0,
                      height: 0,
                      borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent",
                      borderTop: "6px solid red",
                    }}
                  />
                </div>
              )}
            </>
          )}
        </button>

        {/* 🟦 Master Controller — hanya untuk Host/Admin */}
        {isHost && (
          <button
            className="pd-ctrl"
            title="Master Controller"
            onClick={() => navigate("/master-controller")}
          >
            <Icon slug="master" />
          </button>
        )}

        {/* ✏️ Annotation Button — hanya tampil jika user sendiri yang sedang share */}
        {screenShareOn && String(sharingUser) === String(currentUserId) && (
          <button
            className={`pd-ctrl ${isAnnotating ? "is-active" : ""}`}
            title={isAnnotating ? "Stop Annotating" : "Annotate My Screen"}
            onClick={() => setIsAnnotating(!isAnnotating)}
          >
            <Icon slug="annotate" />
          </button>
        )}


        {/* Menu / Back / End */}
        <button className="pd-ghost" onClick={handleMenu}>
          Menu
        </button>

        {showBackButton && (
          <button className="pd-outline" onClick={handleBack}>
            Home
          </button>
        )}

        {showEndButton && (
          <button className="pd-danger" onClick={handleEnd}>
            End Meeting
          </button>
        )}
      </div>
    </footer>
  );
}
