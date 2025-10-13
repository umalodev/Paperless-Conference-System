import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import useMediasoupRoom from "../hooks/useMediasoupRoom";

/** Tombol unlock sekali untuk lewati autoplay policy + audio sinks tersembunyi */
function GlobalAudioLayer({ remotePeers, myPeerId }) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem("audioUnlocked") === "1"
  );
  useEffect(() => {
    sessionStorage.setItem("audioUnlocked", unlocked ? "1" : "0");
  }, [unlocked]);

  // hitung berapa sink yang masih terblokir
  const [blockedCount, setBlockedCount] = useState(0);
  const onBlocked = useCallback(() => setBlockedCount((c) => c + 1), []);
  const onUnblocked = useCallback(
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
  const ref = useRef(null);
  const [needUnlock, setNeedUnlock] = useState(false);
  const prevNeedUnlock = useRef(false);

  useEffect(() => {
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

  useEffect(() => {
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
  // ✅ FIX: Gunakan useState + useEffect untuk sync localStorage setelah mount
  const [meeting, setMeeting] = useState(null);
  const [myPeerId, setMyPeerId] = useState(null);
  const [localStorageReady, setLocalStorageReady] = useState(false);

  useEffect(() => {
    console.log("🔍 MediaRoomProvider: Reading localStorage...");
    try {
      const rawMeeting = localStorage.getItem("currentMeeting");
      const rawUser = localStorage.getItem("user");
      console.log("📦 localStorage raw:", {
        currentMeeting: rawMeeting,
        user: rawUser,
      }); // ✅ Log detail: Ini akan tampil isi exact

      const cm = rawMeeting ? JSON.parse(rawMeeting) : null;
      const newMeeting = cm?.id || cm?.meetingId || cm?.code || null;

      const userRaw = rawUser || "{}";
      const newPeerId = String(
        JSON.parse(userRaw)?.id || localStorage.getItem("userId") || "me"
      );

      console.log("📦 localStorage parsed:", { newMeeting, newPeerId });

      setMeeting(newMeeting);
      setMyPeerId(newPeerId);
      setLocalStorageReady(true);
    } catch (e) {
      console.error("❌ Error reading localStorage:", e);
      setLocalStorageReady(true); // Tetap set true biar UI gak stuck
    }
  }, []); // Run sekali setelah mount

  // ✅ Hook hanya jalan jika localStorage ready + valid
  const media = useMediasoupRoom({
    roomId: meeting,
    peerId: myPeerId,
  });

  const value = useMemo(
    () => ({
      ...media,
      myPeerId,
      localStorageReady, // Export untuk debug di consumer
    }),
    [media, myPeerId, localStorageReady]
  );

  // Jika localStorage gak ready atau invalid, tampilkan loading dengan style visible
  if (!localStorageReady) {
    return (
      <div
        style={{
          padding: 20,
          textAlign: "center",
          backgroundColor: "white", // ✅ Fix black screen: Force white bg
          color: "black",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading meeting data...
      </div>
    );
  }

  if (!meeting || !myPeerId) {
    return (
      <div
        style={{
          padding: 20,
          textAlign: "center",
          backgroundColor: "white", // ✅ Fix black screen
          color: "black",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Meeting data not found. Please join a meeting first.
        <br />
        <small>Check console for localStorage details.</small>
      </div>
    );
  }

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
