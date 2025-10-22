// src/features/menu/participants/components/ParticipantSummary.jsx
import React from "react";
import Icon from "../../../../components/Icon.jsx";

export default function ParticipantSummary({ totals }) {
  return (
    <div className="prt-summary">
      <div className="prt-card">
        <div className="prt-card-icon">
          <Icon slug="users" />
        </div>
        <div>
          <div className="prt-card-title">{totals?.total ?? 0}</div>
          <div className="prt-card-sub">Total</div>
        </div>
      </div>
      <div className="prt-card">
        <div className="prt-card-icon">
          <Icon slug="mic" />
        </div>
        <div>
          <div className="prt-card-title">{totals?.micOn ?? 0}</div>
          <div className="prt-card-sub">Mic On</div>
        </div>
      </div>
      <div className="prt-card">
        <div className="prt-card-icon">
          <Icon slug="camera" />
        </div>
        <div>
          <div className="prt-card-title">{totals?.camOn ?? 0}</div>
          <div className="prt-card-sub">Cam On</div>
        </div>
      </div>
    </div>
  );
}
