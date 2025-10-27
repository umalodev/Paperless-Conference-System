import React, { useState } from "react";
import Icon from "../../../../components/Icon.jsx";
import MaterialCard from "./MaterialCard.jsx";
import { formatMeta, extKind } from "../utils/format.js";
import { formatDateRange } from "../../../../utils/format.js";

export default function HistoryGroup({ group, onPreview, onDownload }) {
  const [open, setOpen] = useState(false);
  const { meetingId, title, startTime, endTime, status, materials } = group;

  return (
    <div className={`mtl-acc ${open ? "open" : ""}`}>
      <button className="mtl-acc-head" onClick={() => setOpen((o) => !o)}>
        <div className="mtl-acc-info">
          <div className="mtl-acc-title">
            {title || `Meeting #${meetingId}`}
            {status && <span className={`mtl-chip ${status}`}>{status}</span>}
          </div>
          <div className="mtl-acc-meta">
            {formatDateRange(startTime, endTime)}
          </div>
        </div>
        <div className="mtl-acc-count">
          <Icon slug="files" />
          {materials?.length || 0}
        </div>
      </button>

      {open && (
        <div className="mtl-acc-body">
          {(!materials || materials.length === 0) && (
            <div className="pd-empty">Tidak ada materials.</div>
          )}
          {materials && materials.length > 0 && (
            <div className="mtl-grid">
              {materials.map((it) => (
                <MaterialCard
                  key={it.id}
                  name={it.name}
                  meta={formatMeta(it)}
                  ext={extKind(it.name)}
                  onPreview={() => onPreview(it)}
                  onDownload={() => onDownload(it)}
                  canDelete={false}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
