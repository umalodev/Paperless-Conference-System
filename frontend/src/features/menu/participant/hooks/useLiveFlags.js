// src/features/menu/participants/hooks/useLiveFlags.js
import { useCallback } from "react";

/**
 * Hook untuk menentukan status mic/cam aktif pada setiap participant.
 * @param {Map} remotePeers - daftar peer dari mediasoup
 * @param {string} myPeerId - id peer lokal
 * @param {boolean} micOn - status mic lokal
 * @param {boolean} camOn - status cam lokal
 * @returns {(participant: object) => { mic: boolean, cam: boolean }}
 */
export default function useLiveFlags(remotePeers, myPeerId, micOn, camOn) {
  return useCallback(
    (participant) => {
      const pid = String(participant.id);
      if (pid === String(myPeerId)) {
        return { mic: !!micOn, cam: !!camOn };
      }
      const r = remotePeers.get(pid);
      return {
        mic: r?.audioActive ?? false,
        cam: r?.videoActive ?? false,
      };
    },
    [remotePeers, myPeerId, micOn, camOn]
  );
}
