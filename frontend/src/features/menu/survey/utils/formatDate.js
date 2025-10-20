// src/features/survey/utils/formatDate.js

/**
 * Format tanggal menjadi bentuk yang lebih mudah dibaca.
 * Contoh output:
 *   - "20 Oct 2025, 14:30"
 *   - "3 Mar 2025, 08:15"
 *
 * @param {string|Date} value
 * @returns {string}
 */
export function formatDate(value) {
  const d = new Date(value);
  if (isNaN(d)) return String(value || "");
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
