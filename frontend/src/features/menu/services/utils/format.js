/**
 * Ubah status layanan menjadi label yang ramah pengguna.
 */
export function formatStatus(status) {
  if (!status) return "";
  switch (status.toLowerCase()) {
    case "done":
      return "Completed";
    case "pending":
      return "Pending";
    case "accepted":
      return "Accepted";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

/**
 * Format waktu (misalnya "10:23 AM" atau "2:05 PM").
 */
export function formatTime(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Potong teks terlalu panjang untuk tampilan ringkas.
 */
export function truncate(text, max = 50) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
