// src/features/menu/files/components/FilesHistoryGroup.jsx
import React, { useState } from "react";
import Icon from "../../../../components/Icon.jsx";
import { FileCard } from "./index";
import { formatDateRange } from "../../../../utils/format.js";

export default function FilesHistoryGroup({ group, me, onOpen, onDownload, onDelete }) {
  const [open, setOpen] = useState(false);
  const { meetingId, title, startTime, endTime, status, files } = group || {};

  return (
    <div className={`facc ${open ? "open" : ""}`}>
      <button className="facc-head" onClick={() => setOpen((o) => !o)}>
        <div className="facc-info">
          <div className="facc-title">
            {title || `Meeting #${meetingId}`}
            {status && <span className={`fchip ${status}`}>{status}</span>}
          </div>
          <div className="facc-meta">{formatDateRange(startTime, endTime)}</div>
        </div>
        <div className="facc-count">
          <Icon slug="files" size={16} />
          {files?.length || 0}
        </div>
      </button>

      {open && (
        <div className="facc-body">
          {(!files || files.length === 0) && (
            <div className="pd-empty">Tidak ada file.</div>
          )}
          {files && files.length > 0 && (
            <div className="mtl-grid files-grid">
              {files.map((f) => (
                <FileCard
                  key={f.fileId || f.url}
                  file={f}
                  me={me}
                  onOpen={() => onOpen(f)}
                  onDownload={() => onDownload(f)}
                  onDelete={() => onDelete && onDelete(f.fileId)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
