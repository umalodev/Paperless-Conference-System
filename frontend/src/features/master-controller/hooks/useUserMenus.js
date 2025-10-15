import { useEffect, useState, useMemo } from "react";
import { API_URL } from "../../../config";
import meetingService from "../../../services/meetingService.js";

/**
 * useUserMenus()
 * Hook untuk mengambil menu user dan memicu render otomatis ketika data siap.
 * Tidak perlu klik refresh manual.
 */
export default function useUserMenus() {
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");
  const [refreshKey, setRefreshKey] = useState(0); // 🔁 trigger rerender

  useEffect(() => {
    let cancel = false;

    const fetchMenus = async () => {
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
              flag: m.flag ?? "Y",
              iconUrl: m.iconMenu || null,
              seq: m.sequenceMenu,
            }))
          : [];

        if (!cancel) {
          setMenus(list);
          setRefreshKey((k) => k + 1); // ✅ paksa trigger re-render
        }
      } catch (e) {
        if (!cancel) setErrMenus(String(e.message || e));
      } finally {
        if (!cancel) setLoadingMenus(false);
      }
    };

    fetchMenus();
    return () => {
      cancel = true;
    };
  }, []);

  const visibleMenus = useMemo(() => {
    return (menus || [])
      .filter((m) => (m?.flag ?? "Y") === "Y")
      .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999));
  }, [menus, refreshKey]); // ✅ ikut re-render setelah refreshKey berubah

  return { menus, visibleMenus, loadingMenus, errMenus };
}
