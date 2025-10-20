// src/features/whiteboard/hooks/useWhiteboardMenu.js
import { useState, useEffect, useMemo } from "react";
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";

export default function useWhiteboardMenu() {
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingMenus(true);
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
        if (!cancel) setMenus(list);
      } catch (e) {
        if (!cancel) setErrMenus(String(e.message || e));
      } finally {
        if (!cancel) setLoadingMenus(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const visibleMenus = useMemo(
    () => menus.filter((m) => (m?.flag ?? "Y") === "Y").sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999)),
    [menus]
  );

  return { menus, visibleMenus, loadingMenus, errMenus };
}
