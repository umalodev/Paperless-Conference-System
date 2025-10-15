import React from "react";

export default function ParticipantCard({
  participant,
  mirrorFrame,
  sendCommand,
  setFullscreenId,
  setSelectedInfo,
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div className={`mc-monitor-item ${participant.isLocked ? "locked" : ""}`}>
      <div
        className="mc-monitor-screen"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onDoubleClick={() => setFullscreenId(participant.id)}
      >
        {mirrorFrame ? (
          <canvas
            ref={(ref) => {
              if (!ref) return;
              const ctx = ref.getContext("2d");
              const img = new Image();
              img.src = `data:image/jpeg;base64,${mirrorFrame}`;
              img.onload = () => ctx.drawImage(img, 0, 0, ref.width, ref.height);
            }}
            width={320}
            height={180}
            className="mc-monitor-canvas"
          />
        ) : (
          <div className="mc-monitor-placeholder">
            <img src="/img/display-slash.png" alt="No mirror" />
            <p>No mirror active</p>
          </div>
        )}
      </div>

      <div className="mc-monitor-info">
        <strong>{participant.account?.displayName || "Unknown"}</strong>
        <small className="mc-role">({participant.account?.role || "participant"})</small>
      </div>

      <div className="mc-monitor-actions icons-only">
        <button className="icon-btn green" onClick={() => setSelectedInfo(participant)}>
          <img src="/img/info.png" alt="Info" />
        </button>
        {mirrorFrame ? (
          <button className="icon-btn red" onClick={() => sendCommand(participant.id, "mirror-stop")}>
            <img src="/img/cross.png" alt="Stop Mirror" />
          </button>
        ) : (
          <button className="icon-btn blue" onClick={() => sendCommand(participant.id, "mirror-start")}>
            <img src="/img/eye.png" alt="Start Mirror" />
          </button>
        )}
        <button
          className="icon-btn gray"
          onClick={() => sendCommand(participant.id, participant.isLocked ? "unlock" : "lock")}
        >
          <img src={`/img/${participant.isLocked ? "unlock" : "lock"}.png`} alt="Lock" />
        </button>
        <button className="icon-btn yellow" onClick={() => sendCommand(participant.id, "restart")}>
          <img src="/img/refresh.png" alt="Restart" />
        </button>
        <button className="icon-btn dark" onClick={() => sendCommand(participant.id, "shutdown")}>
          <img src="/img/power.png" alt="Shutdown" />
        </button>
      </div>
    </div>
  );
}
