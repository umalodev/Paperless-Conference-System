import { API_URL } from "../../../../config";
import meetingService from "../../../../services/meetingService.js";

export async function fetchUserMenus() {
  const res = await fetch(`${API_URL}/api/menu/user/menus`, {
    headers: meetingService.getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const list = Array.isArray(json?.data)
    ? json.data.map((m) => ({
        menuId: m.menuId,
        slug: m.slug,
        label: m.displayLabel,
        flag: m.flag ?? "Y",
        iconUrl: m.iconMenu || null,
        seq: m.sequenceMenu,
      }))
    : [];
  return list;
}
