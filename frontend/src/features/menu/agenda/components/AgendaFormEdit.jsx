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
    <form className="agenda-form" onSubmit={(e) => {
      e.preventDefault();
      submitEdit(form.id); // ✅ pastikan ID dikirim ke submitEdit
    }}>
      {/* === Judul === */}
      <div className="af-row">
        <label className="af-label">
          Judul <span className="req-star">*</span>
        </label>
        <input
          name="judul"
          className="af-input"
          placeholder="Agenda title"
          value={form.judul}
          onChange={handleFormChange}
          required
          onInvalid={(e) => e.target.setCustomValidity("Judul wajib diisi.")}
          onInput={(e) => e.currentTarget.setCustomValidity("")}
        />
      </div>

      {/* === Deskripsi === */}
      <div className="af-row">
        <label className="af-label">Deskripsi</label>
        <textarea
          name="deskripsi"
          className="af-textarea"
          rows={2}
          placeholder="Optional"
          value={form.deskripsi}
          onChange={handleFormChange}
        />
      </div>

      {/* === Tanggal dan Waktu === */}
      <div className="af-grid">
        <div className="af-col">
          <label className="af-label">
            Tanggal <span className="req-star">*</span>
          </label>
          <input
            type="date"
            name="date"
            className="af-input"
            value={form.date}
            onChange={handleFormChange}
            required
            onInvalid={(e) =>
              e.target.setCustomValidity("Tanggal wajib diisi.")
            }
            onInput={(e) => e.currentTarget.setCustomValidity("")}
          />
        </div>

        <div className="af-col">
          <label className="af-label">
            Mulai <span className="req-star">*</span>
          </label>
          <input
            type="time"
            name="start"
            className="af-input"
            value={form.start}
            onChange={handleFormChange}
            required
            onInvalid={(e) =>
              e.target.setCustomValidity("Jam mulai wajib diisi.")
            }
            onInput={(e) => e.currentTarget.setCustomValidity("")}
          />
        </div>

        <div className="af-col">
          <label className="af-label">
            Selesai <span className="req-star">*</span>
          </label>
          <input
            type="time"
            name="end"
            className="af-input"
            value={form.end}
            onChange={handleFormChange}
            required
            onInvalid={(e) =>
              e.target.setCustomValidity("Jam selesai wajib diisi.")
            }
            onInput={(e) => e.currentTarget.setCustomValidity("")}
          />
        </div>
      </div>

      {/* === Error Message === */}
      {formErr && <div className="pd-error mt-8">{formErr}</div>}

      {/* === Actions === */}
      <div className="af-actions">
        <button
          type="button"
          className="pd-ghost"
          onClick={closeEdit}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="pd-danger"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
