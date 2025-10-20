export function toLocalDT(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString([], {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const time = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${date} ${time}`;
  } catch {
    return "—";
  }
}
