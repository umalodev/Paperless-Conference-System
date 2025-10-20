// src/features/menu/participants/components/AudioSink.jsx
import React, { useRef, useState, useEffect } from "react";

export default function AudioSink({ stream, muted, hideButton = false }) {
  const ref = useRef(null);
  const [needUnlock, setNeedUnlock] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const hasAudio = !!stream && stream.getAudioTracks().length > 0;
    el.srcObject = hasAudio ? stream : null;

    if (hasAudio && !muted) {
      el.play().then(() => setNeedUnlock(false)).catch(() => setNeedUnlock(true));
    }
  }, [stream, muted]);

  return (
    <>
      {!muted && needUnlock && !hideButton && (
        <button className="pd-audio-unlock" onClick={() => ref.current.play()}>
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
