// src/features/chat/components/ParticipantSelector.jsx
import React from "react";

export default function ParticipantSelector({
  participants,
  user,
  loading,
  onSelectParticipant,
}) {
  const activeParticipants = participants.filter(
    (p) => String(p.userId) !== String(user?.id)
  );

  return (
    <div className="participant-selector">
      <h3>Select a Participant for Private Chat:</h3>
      {loading ? (
        <div className="pd-empty">Loading participants...</div>
      ) : activeParticipants.length > 0 ? (
        <div className="participant-list">
          {activeParticipants.map((participant) => (
            <button
              key={participant.id}
              className="participant-item"
              onClick={() => onSelectParticipant(participant)}
            >
              <div className="participant-avatar">
                {(participant.displayName || "U").slice(0, 2).toUpperCase()}
              </div>
              <div className="participant-info">
                <div className="participant-name">
                  {participant.displayName}
                </div>
                <div className="participant-role">{participant.role}</div>
                <div className="participant-status">
                  <span
                    className={`status-dot ${participant.status}`}
                  ></span>
                  {participant.status}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="pd-empty">No active participants available</div>
      )}
    </div>
  );
}
