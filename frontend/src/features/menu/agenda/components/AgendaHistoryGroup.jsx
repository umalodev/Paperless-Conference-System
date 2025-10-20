// src/features/agenda/components/AgendaHistoryGroup.jsx
import React, { useState } from "react";
import Icon from "../../../../components/Icon.jsx";
import { formatRange, formatDateRange } from "../utils/format.js";

export default function AgendaHistoryGroup({ group }) {
  const [open, setOpen] = useState(false);
  const { meetingId, title, startTime, endTime, status, agendas } = group;

  return (
    <div className={`ag-acc ${open ? "open" : ""}`}>
      <button className="ag-acc-head" onClick={() => setOpen((o) => !o)}>
        <div className="ag-acc-info">
          <div className="ag-acc-title">
            {title || `Meeting #${meetingId}`}
            {status && <span className={`ag-chip ${status}`}>{status}</span>}
          </div>
          <div className="ag-acc-meta">{formatDateRange(startTime, endTime)}</div>
        </div>
        <div className="ag-acc-count">
          <Icon slug="calendar" />
          {agendas?.length || 0}
        </div>
      </button>

      {open && (
        <div className="ag-acc-body">
          {(!agendas || agendas.length === 0) && (
            <div className="pd-empty">No agenda available.</div>
          )}
          {agendas?.length > 0 &&
            agendas.map((a) => (
              <div className="ag-item" key={a.id}>
                <div className="ag-item-left">
                  <span className="ag-dot" />
                  <div className="ag-item-title">{a.judul}</div>
                </div>
                <div className="ag-item-right">
                  <div className="ag-item-time">
                    {formatRange(a.startTime, a.endTime)}
                  </div>
                </div>
                {a.deskripsi && (
                  <div className="ag-item-desc">{a.deskripsi}</div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
