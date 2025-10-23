// src/features/menu/files/components/FileCard.jsx
import React from "react";
import Icon from "../../../../components/Icon.jsx";
import { formatSize, formatDate } from "../../../../utils/format.js";
import { extKind, extLabel, getExt } from "../utils/extKind";

export default function FileCard({ file, me, onOpen, onDownload, onDelete }) {
  const {
    fileId,
    name = "Untitled",
    size = 0,
    createdAt,
    uploaderName,
    uploaderId,
  } = file || {};

  const ext = getExt(name);
  const kind = extKind(name);
  const canDelete =
    me &&
    (Number(me.id) === Number(uploaderId) ||
      ["admin", "host"].includes(me?.role));

  return (
    <div className="mtl-card">
      <div className={`mtl-fileicon ${kind}`} title={ext.toUpperCase()}>
        <div className="mtl-fileext">{extLabel(kind)}</div>
        <Icon slug="file" />
      </div>

      <div className="mtl-info">
        <div
          className="mtl-name"
          title={name}
          onClick={onOpen}
          style={{ cursor: "pointer" }}
        >
          {name}
        </div>
        <div className="mtl-meta">
          {uploaderName ? `oleh ${uploaderName}` : "—"}
          {size ? ` · ${formatSize(size)}` : ""}
          {createdAt ? ` · ${formatDate(createdAt)}` : ""}
        </div>
      </div>

      <div className="mtl-actions-right">
        <button className="mtl-act" onClick={onOpen} title="Buka">
          <img src="/img/buka.png" alt="Buka" className="action-icon" />
        </button>

        <button className="mtl-act" onClick={onDownload} title="Unduh">
          <img src="/img/download1.png" alt="Unduh" className="action-icon" />
        </button>

        {canDelete && (
          <button
            className="mtl-act danger"
            onClick={() => onDelete && onDelete(fileId)}
            title="Delete"
          >
            <img src="/img/hapus1.png" alt="Delete" className="action-icon" />
          </button>
        )}
      </div>
    </div>
  );
}
