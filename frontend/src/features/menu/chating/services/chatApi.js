// src/features/chat/services/chatApi.js
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";

/**
 * Ambil daftar participant dari server
 */
export async function getParticipants(meetingId) {
  const qs = `?meetingId=${encodeURIComponent(meetingId)}`;
  const res = await fetch(`${API_URL}/api/participants/list${qs}`, {
    headers: {
      "Content-Type": "application/json",
      ...(meetingService.getAuthHeaders?.() || {}),
    },
    credentials: "include",
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Gagal memuat peserta.");
  const raw = Array.isArray(json.data) ? json.data : [];
  return raw.map((p) => ({
    ...p,
    id: String(p.id ?? p.participantId ?? p.userId),
    userId: String(p.userId ?? p.id ?? p.participantId),
    displayName: p.displayName || p.name || p.username || "Participant",
    mic: p.mic ?? !!p.isAudioEnabled,
    cam: p.cam ?? !!p.isVideoEnabled,
  }));
}

/**
 * Ambil pesan (global atau private)
 */
export async function getMessages(meetingId, mode = "global", participantId) {
  let url = `${API_URL}/api/chat/meeting/${meetingId}/messages?limit=50`;
  if (mode === "private" && participantId) {
    url += `&userReceiveId=${participantId}`;
  }

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...meetingService.getAuthHeaders(),
    },
  });

  const json = await res.json();
  if (!json.success || !json.data?.messages)
    throw new Error(json.message || "Gagal memuat pesan.");

  return json.data.messages;
}

/**
 * Kirim pesan teks
 */
export async function sendMessage(meetingId, text, userReceiveId = null) {
  const body = { textMessage: text };
  if (userReceiveId) body.userReceiveId = userReceiveId;

  const res = await fetch(`${API_URL}/api/chat/meeting/${meetingId}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...meetingService.getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Gagal mengirim pesan.");
  return json.data;
}

/**
 * Upload file chat
 */
export async function uploadFile(meetingId, file, userReceiveId = null) {
  const formData = new FormData();
  formData.append("file", file);
  if (userReceiveId) formData.append("userReceiveId", userReceiveId);

  const authHeaders = meetingService.getAuthHeaders();
  delete authHeaders["Content-Type"];

  const res = await fetch(`${API_URL}/api/chat/meeting/${meetingId}/upload`, {
    method: "POST",
    headers: authHeaders,
    body: formData,
  });

  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Gagal upload file.");
  return json.data;
}

/**
 * Download file chat
 */
export async function downloadFile(messageId, filename = null) {
  const res = await fetch(`${API_URL}/api/chat/message/${messageId}/download`, {
    headers: { ...meetingService.getAuthHeaders() },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `file-${messageId}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
