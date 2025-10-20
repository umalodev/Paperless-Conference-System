// src/features/menu/files/utils/extKind.js

/** Ambil ekstensi file */
export function getExt(name = "") {
  if (!name) return "";
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

/** Tentukan jenis file berdasarkan ekstensi */
export function extKind(name = "") {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(ext)) return "img";
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx", "rtf"].includes(ext)) return "doc";
  if (["xls", "xlsx", "csv"].includes(ext)) return "xls";
  if (["ppt", "pptx", "key"].includes(ext)) return "ppt";
  if (["zip", "rar", "7z"].includes(ext)) return "zip";
  if (["mp4", "mov", "mkv", "webm", "avi"].includes(ext)) return "vid";
  if (["txt", "md"].includes(ext)) return "txt";
  return "oth";
}

/** Label singkat untuk jenis file */
export function extLabel(kind) {
  const map = {
    img: "IMG",
    pdf: "PDF",
    doc: "DOC",
    xls: "XLS",
    ppt: "PPT",
    zip: "ZIP",
    vid: "VID",
    txt: "TXT",
    oth: "FILE",
  };
  return map[kind] || "FILE";
}
