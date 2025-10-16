import React from "react";
import Icon from "../../../components/Icon.jsx";

export default function ParticipantGrid({
  participants,
  totalCount, // ✅ tambahan baru
  mirrorFrames,
  sendCommand,
  setFullscreenId,
  setSelectedInfo,
  query,
  setQuery,
}) {
  return (
    <div className="mc-monitor-grid">
      {/* === Search Bar === */}
      <div className="mc-monitor-header">
        <div className="prt-search">
          <span className="prt-search-icon">
            <Icon slug="search" />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or role…"
          />
        </div>

        {/* ✅ Counter lebih informatif */}
        <div className="mc-count">
          Showing {participants.length} of {totalCount} participant
          {totalCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* === Jika tidak ada hasil === */}
      {participants.length === 0 ? (
        <div className="mc-empty-result">
          <p style={{ color: "#888", fontSize: "0.95rem" }}>
            No participants found.
          </p>
        </div>
      ) : (
        participants.map((p) => (
          <div
            key={p.id}
            className={`mc-monitor-item ${p.isLocked ? "locked" : ""}`}
          >
            <div
              className="mc-monitor-screen"
              onDoubleClick={() => setFullscreenId(p.id)}
            >
              {mirrorFrames[p.id] ? (
                <div className="mc-monitor-frame">
                  <canvas
                    ref={(ref) => {
                      if (!ref) return;
                      const ctx = ref.getContext("2d");
                      const img = new Image();
                      img.src = `data:image/jpeg;base64,${mirrorFrames[p.id]}`;
                      img.onload = () => {
                        ctx.clearRect(0, 0, ref.width, ref.height);
                        ctx.drawImage(img, 0, 0, ref.width, ref.height);
                      };
                    }}
                    width={320}
                    height={180}
                    className="mc-monitor-canvas"
                  />
                </div>
              ) : (
                <div className="mc-monitor-placeholder">
                  <img src="/img/display-slash.png" alt="No mirror" />
                  <p>No mirror active</p>
                </div>
              )}
            </div>

            <div className="mc-monitor-info">
              <strong>
                {p.account?.displayName ||
                  p.account?.username ||
                  "Unknown"}
              </strong>
              <small className="mc-role">
                ({p.account?.role || "participant"})
              </small>
            </div>

            <div className="mc-monitor-actions icons-only">
              <button
                className="icon-btn green"
                onClick={() => setSelectedInfo(p)}
                title="View Info"
              >
                <img src="/img/info.png" alt="Info" />
              </button>

              {mirrorFrames[p.id] ? (
                <button
                  className="icon-btn red"
                  onClick={() => sendCommand(p.id, "mirror-stop")}
                  title="Stop Mirror"
                >
                  <img src="/img/cross.png" alt="Stop Mirror" />
                </button>
              ) : (
                <button
                  className="icon-btn blue"
                  onClick={() => sendCommand(p.id, "mirror-start")}
                  title="Start Mirror"
                >
                  <img src="/img/eye.png" alt="Start Mirror" />
                </button>
              )}

              {p.isLocked ? (
                <button
                  className="icon-btn gray"
                  onClick={() => sendCommand(p.id, "unlock")}
                  title="Unlock"
                >
                  <img src="/img/unlock.png" alt="Unlock" />
                </button>
              ) : (
                <button
                  className="icon-btn gray"
                  onClick={() => sendCommand(p.id, "lock")}
                  title="Lock"
                >
                  <img src="/img/lock.png" alt="Lock" />
                </button>
              )}

              <button
                className="icon-btn yellow"
                onClick={() => sendCommand(p.id, "restart")}
                title="Restart"
              >
                <img src="/img/refresh.png" alt="Restart" />
              </button>

              <button
                className="icon-btn dark"
                onClick={() => sendCommand(p.id, "shutdown")}
                title="Shutdown"
              >
                <img src="/img/power.png" alt="Shutdown" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
