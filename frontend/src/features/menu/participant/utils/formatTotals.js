// src/features/menu/participants/utils/formatTotals.js

/**
 * Hitung total peserta dan status mic/cam aktif
 * @param {Array} participants - daftar peserta dari DB
 * @param {Map} remotePeers - map dari mediasoup peer
 * @param {boolean} micOn - mic lokal aktif
 * @param {boolean} camOn - cam lokal aktif
 * @returns {{ total: number, micOn: number, camOn: number }}
 */
export function formatTotals(participants, remotePeers, micOn, camOn) {
  const total = participants.length;
  const liveMic =
    (micOn ? 1 : 0) +
    Array.from(remotePeers.values()).filter((v) => v.audioActive).length;
  const liveCam =
    (camOn ? 1 : 0) +
    Array.from(remotePeers.values()).filter((v) => v.videoActive).length;

  return { total, micOn: liveMic, camOn: liveCam };
}
