import React, { createContext, useContext, useMemo, useState } from "react";
import useMediasoupRoom from "../hooks/useMediasoupRoom";

/** Tombol unlock sekali untuk lewati autoplay policy + audio sinks tersembunyi */
function GlobalAudioLayer({ remotePeers, myPeerId }) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem("audioUnlocked") === "1"
  );
  React.useEffect(() => {
    sessionStorage.setItem("audioUnlocked", unlocked ? "1" : "0");
  }, [unlocked]);

  // hitung berapa sink yang masih terblokir
  const [blockedCount, setBlockedCount] = React.useState(0);
  const onBlocked = React.useCallback(() => setBlockedCount((c) => c + 1), []);
  const onUnblocked = React.useCallback(
    () => setBlockedCount((c) => Math.max(0, c - 1)),
    []
  );

  const triggerReplayAll = () => setUnlocked((u) => !u);

  // tombol global; tampil sampai user klik sekali
  return (
    <>
      {!unlocked && blockedCount > 0 && (
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
            onBlocked={onBlocked}
            onUnblocked={onUnblocked}
          />
        ))}
      </div>
    </>
  );
}

/** Dipakai GlobalAudioLayer */
function AudioSink({
  stream,
  muted,
  hideButton = false,
  unlockedSignal,
  onBlocked,
  onUnblocked,
}) {
  const ref = React.useRef(null);
  const [needUnlock, setNeedUnlock] = React.useState(false);
  const prevNeedUnlock = React.useRef(false);

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

  React.useEffect(() => {
    if (needUnlock !== prevNeedUnlock.current) {
      prevNeedUnlock.current = needUnlock;
      if (needUnlock) onBlocked && onBlocked();
      else onUnblocked && onUnblocked();
    }
  }, [needUnlock, onBlocked, onUnblocked]);

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
      {meeting && media.remotePeers?.size > 0 && (
        <GlobalAudioLayer remotePeers={media.remotePeers} myPeerId={myPeerId} />
      )}
    </MediaRoomContext.Provider>
  );
}

export function useMediaRoom() {
  const ctx = useContext(MediaRoomContext);
  if (!ctx)
    throw new Error("useMediaRoom must be used inside <MediaRoomProvider>");
  return ctx;
}
