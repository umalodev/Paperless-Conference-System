// src/features/menu/files/components/SkeletonAccordion.jsx
import React from "react";

export default function SkeletonAccordion() {
  return (
    <div className="files-accordion skeleton-accordion">
      {Array.from({ length: 3 }).map((_, i) => (
        <div className="sk-acc" key={i}>
          <div className="sk-head">
            <div className="sk-line short" />
            <div className="sk-line long" />
          </div>
          <div className="sk-body">
            <div className="sk-line" />
            <div className="sk-line" />
            <div className="sk-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}
