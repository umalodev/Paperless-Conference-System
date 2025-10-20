// src/features/menu/files/components/SkeletonGrid.jsx
import React from "react";

export default function SkeletonGrid() {
  return (
    <div className="mtl-grid skeleton-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="sk-card" key={i}>
          <div className="sk-line short" />
          <div className="sk-line" />
          <div className="sk-line long" />
        </div>
      ))}
    </div>
  );
}
