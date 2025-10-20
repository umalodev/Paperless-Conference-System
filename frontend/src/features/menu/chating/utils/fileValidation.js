// src/features/chat/utils/fileValidation.js

/**
 * Validasi file sebelum diunggah ke server
 * @param {File} file - File yang akan dicek
 * @returns {{valid: boolean, message?: string}}
 */
export function validateFile(file) {
  if (!file) return { valid: false, message: "Tidak ada file yang dipilih." };

  const allowedMimes = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "video/mp4",
    "video/avi",
    "video/mov",
    "video/wmv",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
  ]);

  const bannedExts = [
    ".exe",
    ".msi",
    ".bat",
    ".cmd",
    ".sh",
    ".ps1",
    ".vbs",
    ".js",
    ".mjs",
    ".jar",
    ".com",
    ".scr",
    ".dll",
    ".so",
    ".dylib",
    ".php",
    ".pl",
    ".py",
    ".rb",
  ];

  const lowerName = (file.name || "").toLowerCase();
  const ext = lowerName.slice(lowerName.lastIndexOf("."));
  const base = lowerName.substring(0, lowerName.length - ext.length);
  const secondExt = base.includes(".")
    ? base.slice(base.lastIndexOf("."))
    : "";

  if (
    bannedExts.includes(ext) ||
    bannedExts.includes(secondExt) ||
    !allowedMimes.has(file.type)
  ) {
    return {
      valid: false,
      message:
        "Format file tidak didukung. Unggah dokumen, gambar, arsip, atau media yang diizinkan.",
    };
  }

  // Batas ukuran file opsional (misal 50MB)
  const MAX_SIZE_MB = 50;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { valid: false, message: `Ukuran file melebihi ${MAX_SIZE_MB}MB.` };
  }

  return { valid: true };
}
