import React from "react";

export default function NotesSkeleton() {
  return (
    <div className="notes-grid">
      {[1, 2, 3].map((i) => (
        <div key={i} className="note-card skeleton">
          <div className="note-title skeleton-line" />
          <div className="note-body skeleton-block" />
          <div className="note-meta skeleton-line short" />
        </div>
      ))}
    </div>
  );
}
