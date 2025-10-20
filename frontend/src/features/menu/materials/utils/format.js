// src/features/materials/utils/format.js

/**
 * Ambil nama file dari path atau URL
 * @param {string} p - path file
 */
export function guessName(p = "") {
  try {
    const s = p.split("?")[0];
    return s.split("/").pop() || "file";
  } catch {
    return "file";
  }
}

/**
 * Format tanggal pembuatan material
 * @param {Object} it - material item
 */
export function formatMeta(it) {
  return it.createdAt
    ? new Date(it.createdAt).toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
}

/**
 * Format rentang tanggal (start–end)
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
 * Tentukan jenis file berdasarkan ekstensi
 */
export function extKind(name = "") {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "img";
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx", "rtf"].includes(ext)) return "doc";
  if (["xls", "xlsx", "csv"].includes(ext)) return "xls";
  if (["ppt", "pptx", "key"].includes(ext)) return "ppt";
  if (["zip", "rar", "7z"].includes(ext)) return "zip";
  if (["txt", "md"].includes(ext)) return "txt";
  return "oth";
}

/**
 * Label pendek untuk ikon file
 */
export function extLabel(kind) {
  const map = {
    img: "IMG",
    pdf: "PDF",
    doc: "DOC",
    xls: "XLS",
    ppt: "PPT",
    zip: "ZIP",
    txt: "TXT",
    oth: "FILE",
  };
  return map[kind] || "FILE";
}
