// src/features/whiteboard/utils/format.js

/**
 * Format waktu dalam format "HH:MM"
 */
export function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Format tanggal menjadi format "DD/MM/YYYY"
 */
export function formatDate(date = new Date()) {
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format nama pengguna jadi inisial (misal: "John Doe" → "JD")
 */
export function formatInitials(name = "") {
  return name
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

/**
 * Format ukuran file dalam KB/MB
 */
export function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
