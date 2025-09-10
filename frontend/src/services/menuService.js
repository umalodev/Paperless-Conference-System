// src/services/menuService.js
import { API_URL } from "../config";

/**
 * Get user menus for bottom navigation
 * @returns {Promise<Array>} Array of menu items
 */
export async function getUserMenus() {
  const res = await fetch(`${API_URL}/api/menu/user/menus`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  
  const json = await res.json();
  const list = Array.isArray(json?.data)
    ? json.data.map((m) => ({
        slug: m.slug,
        label: m.displayLabel,
        flag: m.flag ?? "Y",
        iconUrl: m.iconMenu || null,
        seq: m.sequenceMenu,
      }))
    : [];
  
  return list;
}
