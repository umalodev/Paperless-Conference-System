// src/features/menu/participants/components/ParticipantItem.jsx
import React from "react";
import Icon from "../../../../components/Icon.jsx";

export default function ParticipantItem({
  participant,
  live,
  myPeerId,
  stopMic,
  startMic,
  stopCam,
  startCam,
  updateParticipantStatus,
}) {
  return (
    <div key={participant.id} className="prt-item">
      <div className="prt-avatar">
        {(participant.displayName || "??").slice(0, 2).toUpperCase()}
      </div>
      <div className="prt-info">
        <div className="prt-name">{participant.displayName}</div>
        <div className="prt-meta">
          <span className="prt-role">{participant.role}</span>
        </div>
        {participant.joinTime && (
          <div className="prt-join-time">
            Joined: {new Date(participant.joinTime).toLocaleTimeString()}
          </div>
        )}
      </div>
      <div className="prt-status">
        <button
          className={`prt-pill ${live.mic ? "on" : "off"}`}
          title={
            live.mic
              ? "Mic On - Click to turn off"
              : "Mic Off - Click to turn on"
          }
          onClick={() => {
            if (String(participant.id) === String(myPeerId)) {
              live.mic ? stopMic() : startMic();
            } else {
              updateParticipantStatus(participant.id, {
                mic: !live.mic,
              });
            }
          }}
        >
          <Icon slug="mic" />
        </button>
        <button
          className={`prt-pill ${live.cam ? "on" : "off"}`}
          title={
            live.cam
              ? "Camera On - Click to turn off"
              : "Camera Off - Click to turn on"
          }
          onClick={() => {
            if (String(participant.id) === String(myPeerId)) {
              live.cam ? stopCam() : startCam();
            } else {
              updateParticipantStatus(participant.id, {
                cam: !live.cam,
              });
            }
          }}
        >
          <Icon slug="camera" />
        </button>
      </div>
    </div>
  );
}
