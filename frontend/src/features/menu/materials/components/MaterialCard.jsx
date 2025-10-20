import React from "react";
import Icon from "../../../../components/Icon.jsx";
import { extLabel } from "../utils/format.js";

export default function MaterialCard({
  name,
  meta,
  ext,
  onPreview,
  onDownload,
  onDelete,
  canDelete,
}) {
  return (
    <div className="mtl-card">
      <div className={`mtl-fileicon ${ext}`}>
        <div className="mtl-fileext">{extLabel(ext)}</div>
        <Icon slug="file" />
      </div>

      <div className="mtl-info">
        <div className="mtl-name" title={name}>
          {name}
        </div>
        <div className="mtl-meta">{meta}</div>
      </div>

      <div className="mtl-actions-right">
        <button className="mtl-act" title="Lihat" onClick={onPreview}>
          <img src="/img/buka.png" alt="Lihat" className="action-icon" />
        </button>

        <button className="mtl-act" title="Unduh" onClick={onDownload}>
          <img src="/img/download1.png" alt="Unduh" className="action-icon" />
        </button>

        {canDelete && onDelete && (
          <button className="mtl-act danger" title="Delete" onClick={onDelete}>
            <img src="/img/hapus1.png" alt="Delete" className="action-icon" />
          </button>
        )}
      </div>
    </div>
  );
}
