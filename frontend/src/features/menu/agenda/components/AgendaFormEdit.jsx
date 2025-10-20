// src/features/agenda/components/AgendaFormEdit.jsx
import React from "react";

export default function AgendaFormEdit({
  form,
  formErr,
  saving,
  handleFormChange,
  submitEdit,
  closeEdit,
}) {
  return (
    <form className="agenda-form" onSubmit={submitEdit}>
      <div className="af-row">
        <label className="af-label">Title</label>
        <input
          name="judul"
          className="af-input"
          placeholder="Agenda title"
          value={form.judul}
          onChange={handleFormChange}
        />
      </div>

      <div className="af-row">
        <label className="af-label">Description</label>
        <textarea
          name="deskripsi"
          className="af-textarea"
          rows={2}
          placeholder="Optional"
          value={form.deskripsi}
          onChange={handleFormChange}
        />
      </div>

      <div className="af-grid">
        <div className="af-col">
          <label className="af-label">Date</label>
          <input
            type="date"
            name="date"
            className="af-input"
            value={form.date}
            onChange={handleFormChange}
          />
        </div>
        <div className="af-col">
          <label className="af-label">Start</label>
          <input
            type="time"
            name="start"
            className="af-input"
            value={form.start}
            onChange={handleFormChange}
          />
        </div>
        <div className="af-col">
          <label className="af-label">End</label>
          <input
            type="time"
            name="end"
            className="af-input"
            value={form.end}
            onChange={handleFormChange}
          />
        </div>
      </div>

      {formErr && <div className="pd-error mt-8">{formErr}</div>}

      <div className="af-actions">
        <button type="button" className="pd-ghost" onClick={closeEdit} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="pd-danger" disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
