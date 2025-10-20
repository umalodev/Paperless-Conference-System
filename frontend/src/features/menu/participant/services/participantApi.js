// src/features/menu/participants/services/participantApi.js
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";

/**
 * Ambil daftar peserta untuk suatu meeting
 */
export async function getParticipantsList(meetingId) {
  const res = await fetch(`${API_URL}/api/participants/list?meetingId=${meetingId}`, {
    headers: {
      "Content-Type": "application/json",
      ...(meetingService.getAuthHeaders?.() || {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json;
}

/**
 * Update status mic/cam/screen peserta tertentu
 */
export async function updateParticipantStatus(participantId, updates) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No authentication token found");

  const dbUpdates = {};
  if (updates.mic !== undefined) dbUpdates.isAudioEnabled = updates.mic;
  if (updates.cam !== undefined) dbUpdates.isVideoEnabled = updates.cam;
  if (updates.isScreenSharing !== undefined)
    dbUpdates.isScreenSharing = updates.isScreenSharing;

  const res = await fetch(`${API_URL}/api/participants/${participantId}/status`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dbUpdates),
  });

  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}

/**
 * Sinkronisasi displayName peserta (dipanggil di useEffect)
 */
export async function syncDisplayName(meetingId, displayName) {
  return meetingService.setParticipantDisplayName({ meetingId, displayName });
}
