import React from "react";
import Icon from "../../../components/Icon.jsx";
import ParticipantCard from "./ParticipantCard.jsx"; // ✅ import di sini

export default function ParticipantGrid({
  participants,
  totalCount,
  mirrorFrames,
  sendCommand,
  setFullscreenId,
  setSelectedInfo,
  activeMirrorId,
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

        {/* ✅ Counter */}
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
          <ParticipantCard
            key={p.id}
            participant={p}
            mirrorFrame={mirrorFrames[p.id]}
            sendCommand={sendCommand}
            setFullscreenId={setFullscreenId}
            setSelectedInfo={setSelectedInfo}
            activeMirrorId={activeMirrorId}
          />
        ))
      )}
    </div>
  );
}
