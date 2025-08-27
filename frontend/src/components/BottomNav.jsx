import React from "react";

export default function BottomNav({ items = [], active = "", onSelect }) {
  return (
    <nav className="bn-wrap" aria-label="Bottom navigation">
      <div className="bn-inner">
        {items.map((it) => {
          const isActive =
            (active || "").toLowerCase() === it.slug.toLowerCase();
          return (
            <button
              key={it.slug}
              className={`bn-item ${isActive ? "is-active" : ""}`}
              onClick={() => onSelect?.(it)}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="bn-icon">
                {it.iconUrl ? <img src={it.iconUrl} alt="" /> : null}
              </span>
              <span className="bn-label">{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
