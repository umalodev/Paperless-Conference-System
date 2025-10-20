// src/features/whiteboard/services/menuService.js
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";

const menuService = {
  /**
   * Fetch all user menus (bottom navigation)
   */
  async getUserMenus() {
    try {
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
            iconUrl: m.iconMenu || null,
            flag: m.flag ?? "Y",
            seq: m.sequenceMenu,
          }))
        : [];

      return list
        .filter((m) => (m?.flag ?? "Y") === "Y")
        .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999));
    } catch (e) {
      console.error("❌ menuService.getUserMenus error:", e);
      throw e;
    }
  },
};

export default menuService;
