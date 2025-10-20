// src/features/agenda/utils/format.js

/** 
 * Format rentang waktu agenda: "08:00 - 09:30"
 */
export function formatRange(start, end) {
  if (!start || !end) return "-";
  try {
    const s = new Date(start);
    const e = new Date(end);
    const f = (d) =>
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${f(s)} - ${f(e)}`;
  } catch {
    return "-";
  }
}

/**
 * Format rentang tanggal lengkap: "Oct 14, 2025 08:00 – Oct 14, 2025 09:30"
 */
export function formatDateRange(a, b) {
  try {
    const s = a ? new Date(a) : null;
    const e = b ? new Date(b) : null;
    const fmt = (d) =>
      d.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    if (s && e) return `${fmt(s)} – ${fmt(e)}`;
    if (s) return fmt(s);
    if (e) return fmt(e);
    return "—";
  } catch {
    return "—";
  }
}

/**
 * Ubah ISO string menjadi nilai input <input type="date">
 * Contoh: "2025-10-20"
 */
export function toDateInputValue(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch {
    return "";
  }
}

/**
 * Ubah ISO string menjadi nilai input <input type="time">
 * Contoh: "08:30"
 */
export function toTimeInputValue(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}
