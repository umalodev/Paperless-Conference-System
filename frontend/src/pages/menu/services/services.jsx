import React, { useEffect, useMemo, useState } from "react";
import BottomNav from "../../../components/BottomNav";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../../config";

export default function Services() {
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingMenus(true);
        setErrMenus("");
        const res = await fetch(`${API_URL}/api/menu/user/menus`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
    () =>
      (menus || [])
        .filter((m) => (m?.flag ?? "Y") === "Y")
        .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999)),
    [menus]
  );
  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  return (
    <div>
      Services Page
      <BottomNav
        items={visibleMenus}
        active="services"
        onSelect={handleSelectNav}
      />
    </div>
  );
}
