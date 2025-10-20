// src/features/agenda/components/AgendaItem.jsx
import React, { useState } from "react";

export default function AgendaItem({ id, title, time, desc, canEdit, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const hasDesc = !!desc && desc.trim().length > 0;
  const toggle = () => hasDesc && setOpen((v) => !v);

  return (
    <div className={`agenda-item ${open ? "is-open" : ""}`}>
      <div className="agenda-row">
        <div className="agenda-left">
          <button
            type="button"
            className="agenda-title-btn"
            onClick={toggle}
            aria-expanded={open}
            aria-controls={`agenda-desc-${id}`}
            disabled={!hasDesc}
            title={hasDesc ? "View description" : "No description"}
          >
            <span className="agenda-dot" aria-hidden />
            <span className="agenda-item-title">{title}</span>
          </button>

          {canEdit && (
            <div className="agenda-inline-actions">
              <button
                type="button"
                className="ag-icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit && onEdit();
                }}
                title="Edit agenda"
                aria-label="Edit agenda"
              >
                <img src="/img/edit.png" alt="" className="ag-icon-img" />
              </button>
              <button
                type="button"
                className="ag-icon-btn danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete && onDelete();
                }}
                title="Hapus agenda"
                aria-label="Hapus agenda"
              >
                <img src="/img/delete.png" alt="" className="ag-icon-img" />
              </button>
            </div>
          )}
        </div>

        <div className="agenda-right">
          <span className="agenda-time">{time}</span>
          {hasDesc && (
            <button
              type="button"
              className={`agenda-caret-btn ${open ? "is-open" : ""}`}
              aria-label={open ? "Hide description" : "Show description"}
              title={open ? "Hide description" : "Show description"}
              onClick={toggle}
            >
              ▾
            </button>
          )}
        </div>
      </div>

      {hasDesc && open && (
        <div id={`agenda-desc-${id}`} className="agenda-desc" role="region">
          {desc}
        </div>
      )}
    </div>
  );
}
