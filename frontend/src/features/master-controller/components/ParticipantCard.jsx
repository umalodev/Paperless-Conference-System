import React, { useEffect, useRef, useState } from "react";

export default function ParticipantCard({
  participant,
  mirrorFrame,
  sendCommand,
  setFullscreenId,
  setSelectedInfo,
  activeMirrorId,
}) {
  const [hovered, setHovered] = useState(false);
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(Date.now());
  const canvasRef = useRef(null);

  const isAnotherMirrorActive =
    !!activeMirrorId && activeMirrorId !== participant.id;

  // ===== FPS counter update setiap 1 detik =====
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = (now - lastTime.current) / 1000;
      if (diff >= 1) {
        setFps(frameCount.current);
        frameCount.current = 0;
        lastTime.current = now;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ===== Render frame ke canvas =====
  useEffect(() => {
    if (!mirrorFrame || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const img = new Image();
    img.src = `data:image/jpeg;base64,${mirrorFrame}`;
    img.onload = () => {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
      frameCount.current += 1;
    };
  }, [mirrorFrame]);

  // ===== Fullscreen handler =====
  const handleDoubleClick = () => setFullscreenId(participant.id);

  const account = participant.account || {};
  const displayName = account.displayName || participant.name || "Unknown";
  const role = account.role || "Participant";

  return (
    <div className={`mc-monitor-item ${participant.isLocked ? "locked" : ""}`}>
      <div
        className="mc-monitor-screen"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onDoubleClick={handleDoubleClick}
      >
        {mirrorFrame ? (
          <div className="mc-monitor-frame">
            <canvas
              ref={canvasRef}
              width={320}
              height={180}
              className="mc-monitor-canvas"
            />

            {/* ✅ FPS Counter */}
            <div className="mc-fps-overlay">{fps} FPS</div>

            {/* ✅ Hint double click */}
            {hovered && (
              <div className="mc-click-hint">
                <span>Double click to fullscreen</span>
              </div>
            )}
          </div>
        ) : (
          <div className="mc-monitor-placeholder">
            <img src="/img/display-slash.png" alt="No mirror" />
            <p>No mirror active</p>
          </div>
        )}
      </div>

      {/* Info peserta */}
      <div className="mc-monitor-info">
        <strong>{displayName}</strong>
        <small className="mc-role">({role})</small>
      </div>

      {/* Tombol kontrol */}
      <div className="mc-monitor-actions icons-only">
        <button
          className="icon-btn green"
          onClick={() => setSelectedInfo(participant)} // ✅ pass full object
        >
          <img src="/img/info.png" alt="Info" />
        </button>

        {mirrorFrame ? (
          <button
            className="icon-btn red"
            onClick={() => sendCommand(participant.id, "mirror-stop")}
          >
            <img src="/img/cross.png" alt="Stop Mirror" />
          </button>
        ) : (
          <button
            className="icon-btn blue"
            disabled={false} 
            title={
              isAnotherMirrorActive
                ? "Mirror sedang aktif untuk peserta lain"
                : "Start Mirror"
            }
            onClick={() => sendCommand(participant.id, "mirror-start")}
          >
            <img src="/img/eye.png" alt="Start Mirror" />
          </button>
        )}

        <button
          className="icon-btn gray"
          onClick={() =>
            sendCommand(
              participant.id,
              participant.isLocked ? "unlock" : "lock"
            )
          }
        >
          <img
            src={`/img/${participant.isLocked ? "unlock" : "lock"}.png`}
            alt="Lock"
          />
        </button>

        <button
          className="icon-btn yellow"
          onClick={() => sendCommand(participant.id, "restart")}
        >
          <img src="/img/refresh.png" alt="Restart" />
        </button>

        <button
          className="icon-btn dark"
          onClick={() => sendCommand(participant.id, "shutdown")}
        >
          <img src="/img/power.png" alt="Shutdown" />
        </button>
      </div>
    </div>
  );
}
