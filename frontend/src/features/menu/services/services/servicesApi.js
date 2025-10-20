import { API_URL } from "../../../../config";
import meetingService from "../../../../services/meetingService.js";

/**
 * Ambil daftar permintaan layanan berdasarkan role user.
 */
export async function fetchServices({ user, isAssist }) {
  const headers = meetingService.getAuthHeaders();

  const resolveMeetingId = () => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || cm?.code || null;
    } catch {
      return null;
    }
  };

  const meetingId = resolveMeetingId();
  if (!meetingId) throw new Error("Meeting belum aktif");

  if (isAssist) {
    const res = await fetch(`${API_URL}/api/services/meeting/${meetingId}`, {
      headers,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rows = Array.isArray(json?.data) ? json.data : [];
    const others = rows.filter(
      (r) => r.requesterUserId !== (user?.id || user?.userId)
    );
    return { myRequests: [], teamRequests: others };
  } else {
    const me = user?.id || user?.userId;
    if (!me) return { myRequests: [], teamRequests: [] };

    const res = await fetch(
      `${API_URL}/api/services?requesterUserId=${me}&sortBy=created_at&sortDir=DESC`,
      { headers }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return { myRequests: Array.isArray(json?.data) ? json.data : [], teamRequests: [] };
  }
}

/**
 * Kirim permintaan layanan baru.
 */
export async function sendServiceRequest({ user, service, priority, note }) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...meetingService.getAuthHeaders(),
  };

  const resolveMeetingId = () => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || cm?.code || null;
    } catch {
      return null;
    }
  };

  const meetingId = resolveMeetingId();
  if (!meetingId) throw new Error("Meeting belum aktif");

  const getDisplayName = () => {
    const mid = meetingId;
    const byMeeting = localStorage.getItem(`meeting:${mid}:displayName`);
    const name = localStorage.getItem("pconf.displayName");
    if (name && name.trim()) return name.trim();
    if (byMeeting && byMeeting.trim()) return byMeeting.trim();
    const globalName = localStorage.getItem("displayName");
    if (globalName && globalName.trim()) return globalName.trim();
    if (user?.username) return String(user.username).trim();
    return "Participant";
  };

  const body = {
    meetingId,
    serviceKey: service.key,
    serviceLabel: service.label,
    name: getDisplayName(),
    priority,
    note: note.trim() || null,
    requesterUserId: user?.id || user?.userId || undefined,
  };

  const res = await fetch(`${API_URL}/api/services`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = j.message || j.error || text;
    } catch {}
    throw new Error(`HTTP ${res.status}${msg ? ` - ${msg}` : ""}`);
  }

  return res.json();
}

/**
 * Aksi assist/staff.
 */
export async function assignService(id) {
  const res = await fetch(`${API_URL}/api/services/${id}/assign`, {
    method: "POST",
    headers: meetingService.getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateServiceStatus(id, status) {
  const res = await fetch(`${API_URL}/api/services/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...meetingService.getAuthHeaders(),
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function cancelService(id) {
  const res = await fetch(`${API_URL}/api/services/${id}/cancel`, {
    method: "POST",
    headers: meetingService.getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Tandai sudah dilihat oleh assist.
 */
export async function markSeen(meetingId) {
  const res = await fetch(`${API_URL}/api/services/mark-seen`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...meetingService.getAuthHeaders(),
    },
    body: JSON.stringify({ meetingId }),
  });
  return res.ok;
}
