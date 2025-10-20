// src/features/menu/participants/components/VideoGrid.jsx
import React from "react";
import VideoTile from "./VideoTile.jsx";

export default function VideoGrid({
  participants,
  remotePeers,
  localStream,
  camOn,
  displayName,
  myPeerId,
  extractPeerMeta,
  mediaReady,
  mediaError,
}) {
  if (mediaError)
    return <div className="pd-error">Media error: {mediaError}</div>;

  if (!mediaReady) return <div className="pd-empty">Menyiapkan media…</div>;

  return (
    <div className="video-grid">
      <VideoTile
        key="__local__"
        name={displayName || "You"}
        stream={localStream}
        placeholder={!camOn}
        localPreview={true}
      />
      {participants
        .filter((p) => String(p.id) !== String(myPeerId))
        .map((p) => {
          let matchedPeer = null;
          for (const [pid, obj] of remotePeers.entries()) {
            const { participantId, userId } = extractPeerMeta(obj);
            if (
              String(pid) === String(p.id) ||
              String(participantId) === String(p.id) ||
              String(userId) === String(p.id)
            ) {
              matchedPeer = obj;
              break;
            }
          }

          const stream = matchedPeer?.stream || null;
          const hasTrack =
            !!stream &&
            typeof stream.getVideoTracks === "function" &&
            stream.getVideoTracks().some((t) => t.readyState === "live");
          const hasVideo = !!matchedPeer?.videoActive && hasTrack;
          const rev = matchedPeer?._rev || 0;

          return (
            <VideoTile
              key={`${p.id}-${rev}`}
              name={p.displayName || "Participant"}
              stream={stream}
              placeholder={!hasVideo}
            />
          );
        })}
    </div>
  );
}
