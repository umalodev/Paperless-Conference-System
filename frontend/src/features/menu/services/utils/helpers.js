/**
 * Ambil meetingId aktif dari localStorage.
 */
export function resolveMeetingId() {
  try {
    const raw = localStorage.getItem("currentMeeting");
    const cm = raw ? JSON.parse(raw) : null;
    return cm?.id || cm?.meetingId || cm?.code || null;
  } catch {
    return null;
  }
}

/**
 * Ambil nama tampilan pengguna dari localStorage.
 */
export function getMeetingDisplayName(user) {
  const mid = resolveMeetingId();
  const byMeeting = localStorage.getItem(`meeting:${mid}:displayName`);
  const name = localStorage.getItem("pconf.displayName");

  if (name && name.trim()) return name.trim();
  if (byMeeting && byMeeting.trim()) return byMeeting.trim();
  const globalName = localStorage.getItem("displayName");
  if (globalName && globalName.trim()) return globalName.trim();
  if (user?.username) return String(user.username).trim();
  return "Participant";
}

/**
 * Simpan badge count di localStorage dan trigger event.
 */
export function setBadgeLocal(slug, value) {
  try {
    const key = "badge.map";
    const raw = localStorage.getItem(key);
    const map = raw ? JSON.parse(raw) : {};
    map[slug] = value;
    localStorage.setItem(key, JSON.stringify(map));
    window.dispatchEvent(new Event("badge:changed"));
  } catch {}
}

/**
 * Ambil ikon berdasarkan key layanan.
 */
export function iconFor(key) {
  switch (key) {
    case "coffee":
      return "☕";
    case "mineral":
      return "🥤";
    case "clean":
      return "🧹";
    case "staff_assist":
      return "🧑‍💼";
    default:
      return "🔔";
  }
}
