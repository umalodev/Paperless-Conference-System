// src/components/HistoryAccordion.jsx
import React, { useState } from "react";
import Icon from "./Icon.jsx";
import { formatDateRange } from "../utils/format.js";

import "./history-accordion.css";

/**
 * Komponen global untuk menampilkan grup riwayat meeting (reusable)
 *
 * Props:
 * - title, status, startTime, endTime, count
 * - children → isi konten body (list item, card, dll)
 * - emptyText → teks jika tidak ada data
 * - iconSlug → ikon untuk badge count (default: "files")
 * - classPrefix → prefix CSS (mis. "ag", "facc", "mtl")
 */
export default function HistoryAccordion({
  title,
  status,
  startTime,
  endTime,
  count = 0,
  iconSlug = "files",
  emptyText = "No data available.",
  classPrefix = "hist",
  children,
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`${classPrefix}-acc ${open ? "open" : ""}`}>
      <button className={`${classPrefix}-acc-head`} onClick={() => setOpen(!open)}>
        <div className={`${classPrefix}-acc-info`}>
          <div className={`${classPrefix}-acc-title`}>
            {title}
            {status && <span className={`${classPrefix}-chip ${status}`}>{status}</span>}
          </div>
          <div className={`${classPrefix}-acc-meta`}>
            {formatDateRange(startTime, endTime)}
          </div>
        </div>
        <div className={`${classPrefix}-acc-count`}>
          <Icon slug={iconSlug} style={{ width: 14, height: 14 }} />
          {count}
        </div>
      </button>
      

      {open && (
        <div className={`${classPrefix}-acc-body`}>
          {count === 0 ? <div className="pd-empty">{emptyText}</div> : children}
        </div>
      )}
    </div>
  );
}
