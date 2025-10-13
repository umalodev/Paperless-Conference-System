// src/utils/mediaCleanup.js
export const stopTracks = (stream) => {
  if (!stream) return;
  try {
    const tracks = [
      ...(stream.getAudioTracks?.() || []),
      ...(stream.getVideoTracks?.() || []),
    ];
    tracks.forEach((t) => {
      try {
        t.stop?.();
      } catch {}
      try {
        t.enabled = false;
      } catch {}
    });
  } catch {}
};

export const detachAllVideoElements = () => {
  try {
    const vids = document.querySelectorAll("video");
    vids.forEach((v) => {
      try {
        v.srcObject = null;
      } catch {}
      try {
        v.pause?.();
      } catch {}
      try {
        v.removeAttribute("src");
      } catch {}
    });
  } catch {}
};

export const stopScreenShareIfAny = () => {
  try {
    if (window.simpleScreenShare?.isSharing) {
      window.simpleScreenShare.stopScreenShare();
    }
  } catch {}
  try {
    stopTracks(window.screenShareStream);
  } catch {}
};

export const closeRealtimeTransports = async () => {
  try {
    const ms = window.mediasoupRoom || window.mediaRoom || window.msRoom;
    if (ms) {
      try {
        (ms.producers || []).forEach((p) => {
          try {
            p.close?.();
          } catch {}
        });
      } catch {}
      try {
        (ms.consumers || []).forEach((c) => {
          try {
            c.close?.();
          } catch {}
        });
      } catch {}
      try {
        (ms.transports || []).forEach((t) => {
          try {
            t.close?.();
          } catch {}
        });
      } catch {}
      try {
        ms.leave?.();
      } catch {}
      try {
        ms.close?.();
      } catch {}
    }

    const pcs = [
      window.rtcPeerConnection,
      ...(window.peerConnections || []),
    ].filter(Boolean);
    pcs.forEach((pc) => {
      try {
        pc.getSenders?.().forEach((s) => {
          try {
            s.track?.stop?.();
          } catch {}
        });
      } catch {}
      try {
        pc.getReceivers?.().forEach((r) => {
          try {
            r.track?.stop?.();
          } catch {}
        });
      } catch {}
      try {
        pc.close?.();
      } catch {}
    });
    window.peerConnections = [];
    window.rtcPeerConnection = undefined;

    try {
      window.meetingWebSocket?.close?.();
    } catch {}
  } catch {}
};

export const cleanupMediaDevices = () => {
  try {
    stopTracks(window.localStream);
    stopTracks(window.localVideoStream);
    stopTracks(window.localAudioStream);
    stopTracks(window.currentMicStream);
    stopTracks(window.currentCamStream);
    stopTracks(document.getElementById("localVideo")?.srcObject);
    stopTracks(document.getElementById("localAudio")?.srcObject);
  } catch {}
  detachAllVideoElements();
};

/**
 * Matikan semua media & koneksi realtime.
 * @param {object} opts
 * @param {(v:boolean)=>void} [opts.setMic] setState mic UI (opsional)
 * @param {(v:boolean)=>void} [opts.setCam] setState cam UI (opsional)
 * @param {any} [opts.mediaRoom] context/SDK room (opsional)
 */
export const cleanupAllMediaAndRealtime = async (opts = {}) => {
  const { setMic, setCam, mediaRoom } = opts;
  try {
    stopScreenShareIfAny();
    cleanupMediaDevices();

    try {
      mediaRoom?.stopAll?.();
    } catch {}
    try {
      mediaRoom?.leave?.();
    } catch {}

    await closeRealtimeTransports();

    try {
      setMic?.(false);
    } catch {}
    try {
      setCam?.(false);
    } catch {}
  } catch {}
};
