import React from "react";

export default function ServiceQuickOptions({
  quickOptions,
  selectedService,
  onSelect,
  canSend,
  showSendHint,
}) {
  return (
    <div className="svc-quick">
      {showSendHint && !canSend && (
        <span className="svc-tooltip svc-tooltip--grid" role="tooltip">
          Pilih layanan terlebih dahulu
        </span>
      )}

      {quickOptions.map((q) => (
        <button
          key={q.key}
          className={`svc-quick-btn ${
            selectedService?.key === q.key ? "is-active" : ""
          } ${showSendHint && !canSend ? "is-hint" : ""}`}
          onClick={() => onSelect(q)}
          title={q.label}
        >
          <span className="svc-quick-icon">{q.icon}</span>
          <span className="svc-quick-label">{q.label}</span>
        </button>
      ))}
    </div>
  );
}
