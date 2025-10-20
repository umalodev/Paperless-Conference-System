// src/features/agenda/components/AgendaFormAdd.jsx
import React from "react";

export default function AgendaFormAdd({
  form,
  formErr,
  saving,
  addJudulRef,
  addDateRef,
  addStartRef,
  addEndRef,
  handleFormChange,
  submitAdd,
  closeAdd,
}) {
  return (
    <form className="agenda-form" onSubmit={submitAdd} noValidate>
      <div className="af-row">
        <label className="af-label">
          Judul <span className="req-star">*</span>
        </label>
        <input
          ref={addJudulRef}
          name="judul"
          className="af-input"
          placeholder="Example: Opening"
          value={form.judul}
          onChange={handleFormChange}
          required
          onInvalid={(e) => e.target.setCustomValidity("Judul wajib diisi.")}
          onInput={(e) => e.currentTarget.setCustomValidity("")}
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
          <label className="af-label">
            Tanggal <span className="req-star">*</span>
          </label>
          <input
            ref={addDateRef}
            type="date"
            name="date"
            className="af-input"
            value={form.date}
            onChange={handleFormChange}
            required
            onInvalid={(e) => e.target.setCustomValidity("Tanggal wajib diisi.")}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
          />
        </div>
        <div className="af-col">
          <label className="af-label">
            Mulai <span className="req-star">*</span>
          </label>
          <input
            ref={addStartRef}
            type="time"
            name="start"
            className="af-input"
            value={form.start}
            onChange={handleFormChange}
            required
            onInvalid={(e) => e.target.setCustomValidity("Jam mulai wajib diisi.")}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
          />
        </div>
        <div className="af-col">
          <label className="af-label">
            Selesai <span className="req-star">*</span>
          </label>
          <input
            ref={addEndRef}
            type="time"
            name="end"
            className="af-input"
            value={form.end}
            onChange={(e) => {
              if (addEndRef.current) addEndRef.current.setCustomValidity("");
              handleFormChange(e);
            }}
            required
            onInvalid={(e) => e.target.setCustomValidity("Jam selesai wajib diisi.")}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
          />
        </div>
      </div>

      {formErr && <div className="pd-error mt-8">{formErr}</div>}

      <div className="af-actions">
        <button type="button" className="pd-ghost" onClick={closeAdd} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="pd-danger" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
