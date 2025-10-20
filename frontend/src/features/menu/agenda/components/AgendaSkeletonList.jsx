// src/features/agenda/components/AgendaSkeletonList.jsx
import React from "react";

export default function AgendaSkeletonList() {
  return (
    <div className="agenda-skeleton">
      {Array.from({ length: 3 }).map((_, i) => (
        <div className="ag-sk-row" key={i}>
          <span className="ag-sk-dot" />
          <span className="ag-sk-line w-60" />
          <span className="ag-sk-line w-20 right" />
        </div>
      ))}
    </div>
  );
}
