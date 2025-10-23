// src/contexts/MediaRoomContext.jsx
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
import meetingSocketService from "../services/meetingSocketService.js";

/** Tombol unlock audio global (bypass autoplay policy) */
function GlobalAudioLayer({ remotePeers, myPeerId }) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem("audioUnlocked") === "1"
  );
  const [blockedCount, setBlockedCount] = useState(0);

  const onBlocked = useCallback(() => setBlockedCount((c) => c + 1), []);
  const onUnblocked = useCallback(
    () => setBlockedCount((c) => Math.max(0, c - 1)),
    []
  );

  useEffect(() => {
    sessionStorage.setItem("audioUnlocked", unlocked ? "1" : "0");
  }, [unlocked]);

  const triggerReplayAll = () => setUnlocked((u) => !u);

  return (
    <>
      {!unlocked && blockedCount > 0 && (
        <div style={{ position: "fixed", bottom: 16, left: 16, zIndex: 9999 }}>
          <button className="pd-audio-unlock" onClick={triggerReplayAll}>
            Enable audio
          </button>
        </div>
      )}
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
            key={`audio-${pid}-${obj._rev}`}
            stream={obj.stream}
            muted={String(pid) === String(myPeerId)}
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

/** Komponen sink audio tersembunyi */
function AudioSink({
  stream,
  muted,
  hideButton = false,
  unlockedSignal,
  onBlocked,
  onUnblocked,
}) {
  const ref = useRef(null);
  const [tick, setTick] = useState(0);
  const [needUnlock, setNeedUnlock] = useState(false);
  const prevNeedUnlock = useRef(false);

  useEffect(() => {
    if (!stream) return;
    const onAdd = () => setTick((t) => t + 1);
    const onRem = () => setTick((t) => t + 1);
    try {
      stream.addEventListener?.("addtrack", onAdd);
      stream.addEventListener?.("removetrack", onRem);
    } catch {}
    // fallback beberapa browser
    try {
      stream.onaddtrack = onAdd;
    } catch {}
    try {
      stream.onremovetrack = onRem;
    } catch {}
    return () => {
      try {
        stream.removeEventListener?.("addtrack", onAdd);
        stream.removeEventListener?.("removetrack", onRem);
      } catch {}
      try {
        if (stream.onaddtrack === onAdd) stream.onaddtrack = null;
      } catch {}
      try {
        if (stream.onremovetrack === onRem) stream.onremovetrack = null;
      } catch {}
    };
  }, [stream]);

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
  }, [stream, muted, unlockedSignal, tick]);

  useEffect(() => {
    if (needUnlock !== prevNeedUnlock.current) {
      prevNeedUnlock.current = needUnlock;
      if (needUnlock) onBlocked?.();
      else onUnblocked?.();
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

// ====================== CONTEXT ======================

const MediaRoomContext = createContext(null);

export function MediaRoomProvider({ children }) {
  const [meeting, setMeeting] = useState(null);
  const [myPeerId, setMyPeerId] = useState(null);
  const [localStorageReady, setLocalStorageReady] = useState(false);

  /** 🔹 Ambil meeting & user dari localStorage */
  useEffect(() => {
    try {
      const rawMeeting = localStorage.getItem("currentMeeting");
      const rawUser = localStorage.getItem("user");
      const cm = rawMeeting ? JSON.parse(rawMeeting) : null;
      const newMeeting = cm?.id || cm?.meetingId || cm?.code || null;
      const newPeerId = String(
        JSON.parse(rawUser || "{}")?.id ||
          localStorage.getItem("userId") ||
          "me"
      );

      setMeeting(newMeeting);
      setMyPeerId(newPeerId);
    } catch (e) {
      console.error("❌ Error reading localStorage:", e);
    } finally {
      setLocalStorageReady(true);
    }
  }, []);

  // Hook Mediasoup utama
  const media = useMediasoupRoom({
    roomId: meeting,
    peerId: myPeerId,
  });

  // 🔹 Gunakan state manual untuk sinkronisasi mic & cam antar user
  const [micState, setMicState] = useState(false);
  const [camState, setCamState] = useState(false);
  const micRef = useRef(false);
  const camRef = useRef(false);

  useEffect(() => {
    micRef.current = micState;
    camRef.current = camState;
  }, [micState, camState]);

  /** 🔹 Broadcast event perubahan mic/cam */
  const broadcastMediaChange = useCallback(
    (type, value) => {
      if (!meeting || !myPeerId) return;
      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      const participantId = String(userObj?.userId ?? userObj?.id ?? myPeerId);

      const micValue = type === "micOn" ? value : micRef.current;
      const camValue = type === "camOn" ? value : camRef.current;

      console.log("📡 EMIT → participant_media_changed", {
        participantId,
        micOn: micValue,
        camOn: camValue,
      });

      meetingSocketService.send({
        type: "participant_media_changed",
        participantId,
        micOn: micValue,
        camOn: camValue,
      });
    },
    [meeting, myPeerId]
  );

  useEffect(() => {
    if (!media?.mutedByHostTick) return;
    setMicState(false); // footer & item saya padam
    micRef.current = false;
    broadcastMediaChange("micOn", false); // beritahu peserta lain
  }, [media?.mutedByHostTick, broadcastMediaChange]);

  /** 🔹 Override fungsi mic & cam agar broadcast sinkron */
  const startMic = async () => {
    await media.startMic();
    setMicState(true);
    broadcastMediaChange("micOn", true);
  };

  const stopMic = async () => {
    await media.stopMic();
    setMicState(false);
    broadcastMediaChange("micOn", false);
  };

  const startCam = async () => {
    await media.startCam();
    setCamState(true);
    broadcastMediaChange("camOn", true);
  };

  const stopCam = async () => {
    await media.stopCam();
    setCamState(false);
    broadcastMediaChange("camOn", false);
  };

  /** 🔹 Nilai Context */
  const value = useMemo(
    () => ({
      ...media,
      micOn: micState,
      camOn: camState,
      startMic,
      stopMic,
      startCam,
      stopCam,
      myPeerId,
      localStorageReady,
    }),
    [media, micState, camState, myPeerId, localStorageReady]
  );

  /** 🔹 UI Loading state */
  if (!localStorageReady) {
    return (
      <div
        style={{
          padding: 20,
          textAlign: "center",
          backgroundColor: "white",
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
          backgroundColor: "white",
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

  /** 🔹 Provider utama */
  return (
    <MediaRoomContext.Provider value={value}>
      {children}

      {meeting && value.remotePeers && value.remotePeers.size > 0 && (
        <GlobalAudioLayer remotePeers={value.remotePeers} myPeerId={myPeerId} />
      )}
    </MediaRoomContext.Provider>
  );
}

/** Hook pemanggil */
export function useMediaRoom() {
  const ctx = useContext(MediaRoomContext);
  if (!ctx)
    throw new Error("useMediaRoom must be used inside <MediaRoomProvider>");
  return ctx;
}
