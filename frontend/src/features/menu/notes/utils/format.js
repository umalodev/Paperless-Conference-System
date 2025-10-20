/**
 * Format tanggal dari ISO string ke tampilan ringkas
 * Contoh: "2025-10-20T08:45:00Z" → "20 Oct, 15:45"
 */
export function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString([], {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Potong teks terlalu panjang (misal judul atau body catatan)
 * Contoh: truncateText("Lorem ipsum...", 30)
 */
export function truncateText(text, length = 100) {
  if (!text) return "";
  return text.length > length ? `${text.slice(0, length)}…` : text;
}
