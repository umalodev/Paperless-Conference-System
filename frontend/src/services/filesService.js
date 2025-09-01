// src/services/filesService.js
import { API_URL } from "../config";

export async function listFiles(meetingId) {
  const res = await fetch(
    `${API_URL}/api/files?meetingId=${encodeURIComponent(meetingId)}`,
    {
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data || [];
}

export async function uploadFile({ meetingId, file, description }) {
  const fd = new FormData();
  fd.append("meetingId", meetingId);
  if (description) fd.append("description", description);
  fd.append("file", file);

  const res = await fetch(`${API_URL}/api/files`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  if (!res.ok) {
    const t = await res.json().catch(() => ({}));
    throw new Error(t?.message || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data;
}

export async function deleteFile(fileId) {
  const res = await fetch(`${API_URL}/api/files/${fileId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const t = await res.json().catch(() => ({}));
    throw new Error(t?.message || `HTTP ${res.status}`);
  }
  return true;
}
