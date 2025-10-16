// components/BottomNav.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./BottomNav.css";

export default function BottomNav({ items = [], active = "", onSelect }) {
  const [badgeMap, setBadgeMap] = useState(() => {
    try {
      const x = localStorage.getItem("badge.map");
      return x ? JSON.parse(x) : {};
    } catch {
      return {};
    }
  });

  // dengarkan perubahan badge global (cross-page)
  useEffect(() => {
    const apply = () => {
      try {
        const x = localStorage.getItem("badge.map");
        setBadgeMap(x ? JSON.parse(x) : {});
      } catch {}
    };
    const onStorage = (e) => {
      if (e.key === "badge.map") apply();
    };
    const onCustom = () => apply();

    window.addEventListener("storage", onStorage);
    window.addEventListener("badge:changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("badge:changed", onCustom);
    };
  }, []);

  // overlay badge dari localStorage ke props.items
  const merged = useMemo(() => {
    return (items || []).map((it) => {
      const slug = (it.slug || "").toLowerCase();
      const override = badgeMap[slug];
      return override != null ? { ...it, badge: override } : it;
    });
  }, [items, badgeMap]);

  return (
    <nav className="bn-wrap" aria-label="Bottom navigation">
      <div className="bn-inner">
        {merged.map((it) => {
          const isActive =
            (active || "").toLowerCase() === (it.slug || "").toLowerCase();

          const itemKey = String(it.menuId ?? it.menu_id ?? it.id ?? it.slug);
          const showBadge = Number(it.badge) > 0;
          const showDot = !showBadge && !!it.hasNew;

          return (
            <button
              key={itemKey}
              className={`bn-item ${isActive ? "is-active" : ""}`}
              onClick={() => onSelect?.(it)}
              aria-current={isActive ? "page" : undefined}
              aria-label={
                showBadge ? `${it.label}, ${it.badge} baru` : it.label
              }
              title={
                showBadge
                  ? `${it.badge} item baru`
                  : showDot
                  ? "Ada yang baru"
                  : it.label
              }
            >
              <span className="bn-icon">
                {it.iconUrl ? <img src={it.iconUrl} alt="" /> : null}
                {showDot && <span className="bn-dot" aria-hidden="true" />}
                {showBadge && (
                  <span className="bn-badge" aria-hidden="true">
                    {it.badge > 99 ? "99+" : it.badge}
                  </span>
                )}
              </span>
              <span className="bn-label">{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
