export function publicUrl(p = "") {
  if (!p) return "";
  // Kalau sudah URL absolut, langsung return
  if (/^https?:\/\//i.test(p)) return p;

  // Vite: gunakan BASE_URL untuk handle base path saat deploy (mis. /app/)
  const base = (import.meta?.env?.BASE_URL || "/").replace(/\/+$/, "");
  const rel = p.startsWith("/") ? p : `/${p}`;
  return `${base}${rel}`;
}
