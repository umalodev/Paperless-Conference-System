// src/features/menu/participants/components/VideoTile.jsx
import React, { useRef, useEffect, useState } from "react";
import AudioSink from "./AudioSink.jsx";

export default function VideoTile({
  name,
  stream,
  placeholder = false,
  localPreview = false,
}) {
  const ref = useRef(null);
  const [instance, setInstance] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const hasVideo =
      !!stream &&
      typeof stream.getVideoTracks === "function" &&
      stream.getVideoTracks().length > 0;

    if (placeholder || !hasVideo) {
      el.pause?.();
      el.srcObject = null;
      el.removeAttribute?.("src");
      el.load?.();
      setInstance((n) => n + 1);
      return;
    }

    if (el.srcObject && el.srcObject !== stream) {
      el.pause?.();
      el.srcObject = null;
      el.removeAttribute?.("src");
      el.load?.();
    }

    el.srcObject = stream;
    const tryPlay = () => el.play().catch(() => {});
    el.onloadedmetadata = tryPlay;
    tryPlay();
  }, [stream, placeholder]);

  return (
    <div className="video-item">
      {placeholder ? (
        <div className="video-dummy" aria-label="camera off">
          <span role="img">🎥</span>
        </div>
      ) : (
        <video
          key={instance}
          ref={ref}
          playsInline
          autoPlay
          muted={localPreview}
          className="video-el"
        />
      )}
      <AudioSink stream={stream} muted={true} />
      <div className="video-name">{name}</div>
    </div>
  );
}
