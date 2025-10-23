// src/utils/format.js

/** Format waktu Indonesia: "08:00" atau "21:45" (tanpa AM/PM, cross-platform) */
export function formatTime(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  } catch {
    return "-";
  }
}

/** Format tanggal lengkap Indonesia: "20 Okt 2025, 14:30" */
export function formatDate(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    const datePart = new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(d);
    const timePart = formatTime(d);
    return `${datePart}, ${timePart}`;
  } catch {
    return "-";
  }
}

/** Format rentang tanggal: "14 Okt 2025 08:00 – 14 Okt 2025 09:30" */
export function formatDateRange(a, b) {
  try {
    const s = a ? new Date(a) : null;
    const e = b ? new Date(b) : null;

    const fmt = (d) => {
      const datePart = new Intl.DateTimeFormat("id-ID", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }).format(d);
      const timePart = formatTime(d);
      return `${datePart} ${timePart}`;
    };

    if (s && e) return `${fmt(s)} – ${fmt(e)}`;
    if (s) return fmt(s);
    if (e) return fmt(e);
    return "—";
  } catch {
    return "—";
  }
}

/** Format ukuran file: 1.2 MB, 823 KB, dll */
export function formatSize(bytes = 0) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

/** Ambil nama file dari path/url */
export function guessName(path = "") {
  try {
    const s = path.split("?")[0];
    return s.split("/").pop() || "file";
  } catch {
    return "file";
  }
}

/** Potong teks panjang */
export function truncate(text, max = 100) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Format rentang waktu: "08:00 - 09:30" */
export function formatRange(start, end) {
  if (!start || !end) return "-";
  try {
    const s = new Date(start);
    const e = new Date(end);
    const fmt = (d) => {
      const h = d.getHours().toString().padStart(2, "0");
      const m = d.getMinutes().toString().padStart(2, "0");
      return `${h}:${m}`;
    };
    return `${fmt(s)} - ${fmt(e)}`;
  } catch {
    return "-";
  }
}

/** Ubah ISO string menjadi format input date (contoh: "2025-10-20") */
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

/** Ubah ISO string menjadi format input time (contoh: "08:30") */
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
