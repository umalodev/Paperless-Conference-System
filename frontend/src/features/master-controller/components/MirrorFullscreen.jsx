import React, { useEffect, useRef } from "react";

/**
 * Menampilkan tampilan fullscreen dari mirror participant.
 * @param {object} participant - Data participant yang sedang dimirror.
 * @param {string} frame - Base64 frame dari screen capture.
 * @param {function} onClose - Callback saat overlay ditutup.
 */
export default function MirrorFullscreen({ participant, frame, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!frame || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    const img = new Image();
    img.src = `data:image/jpeg;base64,${frame}`;
    img.onload = () => {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
    };
  }, [frame]);

  return (
    <div className="mc-fullscreen-overlay" onClick={onClose}>
      <div className="mc-fullscreen-container" onClick={(e) => e.stopPropagation()}>
        <button
          className="mc-fullscreen-close"
          onClick={onClose}
          title="Close fullscreen"
        >
          ✖
        </button>

        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="mc-fullscreen-canvas"
        />

        {participant && (
          <div className="mc-fullscreen-info">
            <h2>{participant.hostname || "Unknown Device"}</h2>
            <p>
              👤 {participant.account?.displayName || participant.account?.username || "No User"}{" "}
              {participant.account?.role ? `(${participant.account.role})` : ""}
            </p>
            <small>OS: {participant.os || "N/A"}</small>
          </div>
        )}
      </div>
    </div>
  );
}
