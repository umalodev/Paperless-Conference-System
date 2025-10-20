import React from "react";

export default function SkeletonAccordion() {
  return (
    <div className="mtl-accordion">
      {Array.from({ length: 3 }).map((_, i) => (
        <div className="mtl-acc sk" key={i}>
          <div className="mtl-acc-head">
            <div className="mtl-acc-info">
              <div className="sk-line w-50" />
              <div className="sk-line w-30" />
            </div>
            <div className="mtl-acc-count sk" />
          </div>
        </div>
      ))}
    </div>
  );
}
