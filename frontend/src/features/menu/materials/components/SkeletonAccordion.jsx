import React from "react";

export default function SkeletonGrid() {
  return (
    <div className="mtl-grid">
      {Array.from({ length: 4 }).map((_, i) => (
        <div className="mtl-card sk" key={i}>
          <div className="mtl-fileicon sk" />
          <div className="mtl-info">
            <div className="sk-line w-70" />
            <div className="sk-line w-40" />
          </div>
          <div className="mtl-actions-right">
            <div className="mtl-act sk" />
            <div className="mtl-act sk" />
          </div>
        </div>
      ))}
    </div>
  );
}
