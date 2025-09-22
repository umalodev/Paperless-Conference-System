import React, { createContext, useContext, useMemo, useState } from "react";
import useMediasoupRoom from "../hooks/useMediasoupRoom";

/** Tombol unlock sekali untuk lewati autoplay policy + audio sinks tersembunyi */
function GlobalAudioLayer({ remotePeers, myPeerId }) {
  const [unlocked, setUnlocked] = useState(false);
  const triggerReplayAll = () => setUnlocked((x) => !x);

  // tombol global; tampil sampai user klik sekali
  return (
    <>
      {!unlocked && (
        <div style={{ position: "fixed", bottom: 16, left: 16, zIndex: 9999 }}>
          <button className="pd-audio-unlock" onClick={triggerReplayAll}>
            Enable audio
          </button>
        </div>
      )}
      {/* Sink audio global (hidden). Selalu terpasang di semua halaman */}
      <div
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
        }}
      >
        {Array.from(remotePeers.entries()).map(([pid, obj]) => (
          <AudioSink
            key={`global-audio-${pid}`}
            stream={obj.stream}
            muted={String(pid) === String(myPeerId)} // jangan putar suara kita sendiri
            hideButton
            unlockedSignal={unlocked}
          />
        ))}
      </div>
    </>
  );
}

/** Dipakai GlobalAudioLayer */
function AudioSink({ stream, muted, hideButton = false, unlockedSignal }) {
  const ref = React.useRef(null);
  const [needUnlock, setNeedUnlock] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const hasAudio = !!stream && stream.getAudioTracks().length > 0;
    el.srcObject = hasAudio ? stream : null;
    if (hasAudio && !muted) {
      el.play()
        .then(() => setNeedUnlock(false))
        .catch(() => setNeedUnlock(true));
    }
  }, [stream, muted, unlockedSignal]);

  const unlock = () => {
    const el = ref.current;
    el?.play()
      ?.then(() => setNeedUnlock(false))
      .catch(() => {});
  };

  return (
    <>
      {!muted && needUnlock && !hideButton && (
        <button className="pd-audio-unlock" onClick={unlock}>
          Enable audio
        </button>
      )}
      <audio
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        style={{ display: "none" }}
      />
    </>
  );
}

const MediaRoomContext = createContext(null);

export function MediaRoomProvider({ children }) {
  // Ambil roomId & peerId dari localStorage (biar konsisten lintas halaman)
  const meeting = (() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || cm?.code || null;
    } catch {
      return null;
    }
  })();

  const myPeerId = String(
    JSON.parse(localStorage.getItem("user") || "{}")?.id ||
      localStorage.getItem("userId") ||
      "me"
  );

  const media = useMediasoupRoom({ roomId: meeting, peerId: myPeerId });

  const value = useMemo(() => ({ ...media, myPeerId }), [media, myPeerId]);

  return (
    <MediaRoomContext.Provider value={value}>
      {children}
      {/* Audio global selalu aktif di semua halaman */}
      <GlobalAudioLayer remotePeers={media.remotePeers} myPeerId={myPeerId} />
    </MediaRoomContext.Provider>
  );
}

export function useMediaRoom() {
  const ctx = useContext(MediaRoomContext);
  if (!ctx)
    throw new Error("useMediaRoom must be used inside <MediaRoomProvider>");
  return ctx;
}
