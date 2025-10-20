import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";

/**
 * Ambil semua catatan berdasarkan meetingId
 */
export async function listNotes(meetingId) {
  if (!meetingId) return [];
  const res = await fetch(
    `${API_URL}/api/notes?meetingId=${encodeURIComponent(meetingId)}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...meetingService.getAuthHeaders(),
      },
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

/**
 * Tambah catatan baru
 */
export async function createNote({ meetingId, title, body }) {
  const payload = { meetingId, title, body };
  const res = await fetch(`${API_URL}/api/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...meetingService.getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data;
}

/**
 * Update catatan berdasarkan ID
 */
export async function updateNote(id, { title, body }) {
  const payload = { title, body };
  const res = await fetch(`${API_URL}/api/notes/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...meetingService.getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data;
}

/**
 * Hapus catatan berdasarkan ID
 */
export async function deleteNote(id) {
  const res = await fetch(`${API_URL}/api/notes/${id}`, {
    method: "DELETE",
    headers: meetingService.getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return true;
}
