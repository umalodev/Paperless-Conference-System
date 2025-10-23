// src/features/chat/utils/index.js
export * from "./fileValidation.js";

/**
 * Helper sederhana untuk menampilkan notifikasi error upload
 * agar tidak perlu tulis ulang di setiap file
 */
export function showUploadError(notify, msg, opts = {}) {
  notify({
    variant: "error",
    title: "Upload gagal",
    message: msg || "Terjadi kesalahan saat mengunggah file.",
    autoCloseMs: opts.autoCloseMs ?? 5000,
  });
}

/**
 * Helper untuk mengambil meetingId dari localStorage
 * @returns {string | null}
 */
export function getMeetingId() {
  try {
    const raw = localStorage.getItem("currentMeeting");
    const cm = raw ? JSON.parse(raw) : null;
    return cm?.id || cm?.meetingId || null;
  } catch {
    return null;
  }
}
