// src/features/chat/utils/formatTime.js

/**
 * Format timestamp menjadi waktu lokal yang singkat (HH:mm)
 * @param {number | string | Date} ts
 * @returns {string}
 */
export function formatTime(ts) {
  try {
    const date = new Date(ts);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Format timestamp ke format yang lebih deskriptif (HH:mm, DD MMM)
 * Contoh: "14:32, 21 Okt"
 */
export function formatDetailedTime(ts) {
  try {
    const d = new Date(ts);
    return `${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}, ${d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
    })}`;
  } catch {
    return "";
  }
}
