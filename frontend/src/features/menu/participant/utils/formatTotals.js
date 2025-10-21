// src/features/menu/participants/utils/formatTotals.js

/**
 * Hitung total peserta dan status mic/cam aktif
 * @param {Array} participants - daftar peserta dari DB
 * @param {Map} remotePeers - map dari mediasoup peer
 * @param {boolean} micOn - mic lokal aktif
 * @param {boolean} camOn - cam lokal aktif
 * @param {string|number} myPeerId - ID peer lokal (agar tidak dihitung dua kali)
 * @returns {{ total: number, micOn: number, camOn: number }}
 */
export function formatTotals(participants, remotePeers, micOn, camOn, myPeerId) {
  const total = participants.length;

  let micCount = 0;
  let camCount = 0;

  // ✅ hitung semua peer kecuali diri sendiri
  for (const [pid, peer] of remotePeers.entries()) {
    if (String(pid) === String(myPeerId)) continue;
    if (peer.audioActive) micCount++;
    if (peer.videoActive) camCount++;
  }

  // ✅ tambahkan status lokal
  if (micOn) micCount++;
  if (camOn) camCount++;

  return { total, micOn: micCount, camOn: camCount };
}
