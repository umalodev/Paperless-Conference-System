import React from "react";

export default function ServiceForm({
  selectedService,
  priority,
  note,
  setPriority,
  setNote,
  canSend,
  onClickSend,
}) {
  return (
    <div className="svc-form">
      <div className="svc-form-title">Request</div>

      <div className="svc-form-field">
        <label>Service</label>
        <input
          className="svc-input"
          readOnly
          value={selectedService ? selectedService.label : ""}
          placeholder="Select service from quick menu"
        />
      </div>

      <div className="svc-form-row">
        <div className="svc-form-field svc-priority" style={{ flex: 1 }}>
          <label>Priority</label>
          <select
            className="svc-input"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={!selectedService}
          >
            <option value="Low">Low</option>
            <option value="Normal">Normal</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>

      <div className="svc-form-field">
        <label>Note</label>
        <textarea
          className="svc-textarea"
          rows={2}
          placeholder="Additional note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={!selectedService}
        />
      </div>

      <div className="svc-form-actions" style={{ position: "relative" }}>
        <button
          className={`svc-send ${!canSend ? "is-aria-disabled" : ""}`}
          aria-disabled={!canSend}
          onClick={onClickSend}
        >
          Send
        </button>
      </div>
    </div>
  );
}
