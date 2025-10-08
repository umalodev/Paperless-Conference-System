import React, { useEffect, useMemo, useRef, useState } from "react";
import "./MeetingWizard.css";

export default function MeetingWizardModal({
  open,
  onClose,
  onSave,
  isQuickStart = false,
}) {
  const [tab, setTab] = useState(0); // 0: detail, 1: agenda, 2: materials
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const now = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => {
    const d = isQuickStart
      ? new Date(now.getTime()) // sekarang untuk quick start
      : new Date(now.getTime() + 15 * 60 * 1000); // 15 menit dari sekarang untuk scheduled
    d.setSeconds(0, 0);
    return toLocalInputValue(d);
  }, [now, isQuickStart]);
  const defaultEnd = useMemo(() => {
    const d = isQuickStart
      ? new Date(now.getTime() + 4 * 60 * 60 * 1000) // +4 jam untuk quick start (lebih fleksibel)
      : new Date(now.getTime() + 75 * 60 * 1000); // +75 menit untuk scheduled
    d.setSeconds(0, 0);
    return toLocalInputValue(d);
  }, [now, isQuickStart]);

  const [detail, setDetail] = useState({
    title: "",
    description: "",
    start: defaultStart,
    end: defaultEnd,
  });

  // ---- Tab 2: Agenda
  const [agendaForm, setAgendaForm] = useState({
    judul: "",
    deskripsi: "",
    start: "",
    end: "",
  });
  const [agendas, setAgendas] = useState([]);

  // ---- Tab 3: Materials
  const [materials, setMaterials] = useState([]); // File[]

  useEffect(() => {
    if (!open) {
      // reset saat modal ditutup
      setTab(0);
      setSaving(false);
      setError("");
      setDetail({
        title: "",
        description: "",
        start: defaultStart,
        end: defaultEnd,
      });
      setAgendaForm({ judul: "", deskripsi: "", start: "", end: "" });
      setAgendas([]);
      setMaterials([]);
    }
  }, [open, defaultStart, defaultEnd]);

  // Helpers
  function toLocalInputValue(date) {
    // yyyy-MM-ddTHH:mm untuk <input type="datetime-local">
    const pad = (n) => String(n).padStart(2, "0");
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${y}-${m}-${d}T${hh}:${mm}`;
  }

  const parseCSV = async (file) => {
    const text = await file.text();
    // dukung header: title,description,start,end atau judul,deskripsi,start_time,end_time
    const rows = text
      .split(/\r?\n/)
      .map((r) => r.trim())
      .filter(Boolean);
    if (rows.length === 0) return [];
    const [headerLine, ...dataLines] = rows;
    const headers = headerLine
      .toLowerCase()
      .split(",")
      .map((s) => s.trim());

    const idx = {
      title: headers.findIndex((h) => ["title", "judul"].includes(h)),
      desc: headers.findIndex((h) => ["description", "deskripsi"].includes(h)),
      start: headers.findIndex((h) => ["start", "start_time"].includes(h)),
      end: headers.findIndex((h) => ["end", "end_time"].includes(h)),
    };

    const must = ["title", "start", "end"];
    const ok = must.every((k) => idx[k] >= 0);
    const lines = ok ? dataLines : rows; // jika tak ada header, anggap tiap baris: title,start,end,desc

    return lines.map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      if (ok) {
        return {
          judul: cols[idx.title] || "",
          deskripsi: cols[idx.desc] || "",
          start: cols[idx.start] || "",
          end: cols[idx.end] || "",
        };
      } else {
        return {
          judul: cols[0] || "",
          start: cols[1] || "",
          end: cols[2] || "",
          deskripsi: cols[3] || "",
        };
      }
    });
  };

  // Agenda actions
  const addAgenda = () => {
    if (!agendaForm.judul.trim()) return setError("Agenda title is required.");
    if (!agendaForm.start || !agendaForm.end)
      return setError("Agenda start & end are required.");
    const s = new Date(agendaForm.start);
    const e = new Date(agendaForm.end);
    if (!(s < e)) return setError("Agenda end time must be after start time.");

    setAgendas((arr) => [
      ...arr,
      {
        id: crypto.randomUUID?.() || String(Math.random()),
        judul: agendaForm.judul.trim(),
        deskripsi: agendaForm.deskripsi?.trim() || "",
        start: agendaForm.start,
        end: agendaForm.end,
      },
    ]);
    setAgendaForm({ judul: "", deskripsi: "", start: "", end: "" });
    setError("");
  };

  const removeAgenda = (id) =>
    setAgendas((arr) => arr.filter((a) => a.id !== id));
  const moveAgenda = (id, dir) =>
    setAgendas((arr) => {
      const i = arr.findIndex((a) => a.id === id);
      if (i < 0) return arr.slice();
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return arr.slice();
      const clone = arr.slice();
      [clone[i], (clone[j] = clone[j]), clone[i]];
      return clone;
    });

  // Drag&drop materials
  const dropRef = useRef(null);
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const onPrevent = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onDrop = (e) => {
      onPrevent(e);
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length) setMaterials((m) => [...m, ...files]);
    };
    el.addEventListener("dragover", onPrevent);
    el.addEventListener("dragenter", onPrevent);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", onPrevent);
      el.removeEventListener("dragenter", onPrevent);
      el.removeEventListener("drop", onDrop);
    };
  }, [dropRef]);

  const onPickMaterials = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setMaterials((m) => [...m, ...files]);
    e.target.value = "";
  };
  const removeMaterial = (idx) =>
    setMaterials((m) => m.filter((_, i) => i !== idx));

  // Save
  const handleSave = async () => {
    setError("");

    // validate detail
    if (!detail.title.trim()) return setError("Meeting title is required.");

    // Untuk quick start, waktu sudah diatur otomatis
    if (!isQuickStart) {
      if (!detail.start || !detail.end)
        return setError("Start & End are required.");
      const s = new Date(detail.start);
      const e = new Date(detail.end);
      if (!(s < e)) return setError("End time must be after start time.");
    }

    // build payload
    const payload = {
      title: detail.title.trim(),
      description: detail.description?.trim() || "",
      startTime: isQuickStart
        ? new Date().toISOString() // sekarang untuk quick start
        : new Date(detail.start).toISOString(),
      endTime: isQuickStart
        ? new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // +4 jam untuk quick start
        : new Date(detail.end).toISOString(),
      isQuickStart: isQuickStart, // flag untuk backend
      agendas: agendas.map((a, idx) => ({
        seq: idx + 1,
        judul: a.judul,
        deskripsi: a.deskripsi,
        start_time: a.start ? new Date(a.start).toISOString() : null,
        end_time: a.end ? new Date(a.end).toISOString() : null,
      })),
      materials: materials, // File objects - will be processed separately
    };

    // Log payload for debugging
    console.log("📦 MeetingWizardModal Payload:", {
      title: payload.title,
      description: payload.description,
      startTime: payload.startTime,
      endTime: payload.endTime,
      agendasCount: payload.agendas.length,
      materialsCount: payload.materials.length,
      materials: payload.materials.map((m) => ({
        name: m.name,
        size: m.size,
        type: m.type,
      })),
    });

    try {
      setSaving(true);
      if (onSave) await onSave(payload);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="mw-overlay" role="dialog" aria-modal="true">
      <div className="mw-modal">
        <header className="mw-head">
          <div className="mw-title">
            {isQuickStart ? "Quick Start Meeting" : "Schedule Meeting"}
          </div>
          <button className="mw-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        {/* Tabs */}
        <div className="mw-tabs" role="tablist">
          <button
            className={`mw-tab ${tab === 0 ? "is-active" : ""}`}
            onClick={() => setTab(0)}
            role="tab"
            aria-selected={tab === 0}
          >
            Details
          </button>
          <button
            className={`mw-tab ${tab === 1 ? "is-active" : ""}`}
            onClick={() => setTab(1)}
            role="tab"
            aria-selected={tab === 1}
          >
            Agenda
          </button>
          <button
            className={`mw-tab ${tab === 2 ? "is-active" : ""}`}
            onClick={() => setTab(2)}
            role="tab"
            aria-selected={tab === 2}
          >
            Materials
          </button>
        </div>

        <main className="mw-body">
          {tab === 0 && (
            <section className="mw-pane">
              <div className="mw-row">
                <label className="mw-label">Title (required)</label>
                <input
                  className="mw-input"
                  placeholder="e.g., Weekly Team Standup"
                  value={detail.title}
                  onChange={(e) =>
                    setDetail((s) => ({ ...s, title: e.target.value }))
                  }
                />
              </div>

              <div className="mw-row">
                <label className="mw-label">Description</label>
                <textarea
                  className="mw-textarea"
                  rows={3}
                  placeholder="Optional"
                  value={detail.description}
                  onChange={(e) =>
                    setDetail((s) => ({ ...s, description: e.target.value }))
                  }
                />
              </div>

              {!isQuickStart && (
                <div className="mw-grid">
                  <div className="mw-col">
                    <label className="mw-label">Start</label>
                    <input
                      type="datetime-local"
                      className="mw-input"
                      value={detail.start}
                      onChange={(e) =>
                        setDetail((s) => ({ ...s, start: e.target.value }))
                      }
                    />
                  </div>
                  <div className="mw-col">
                    <label className="mw-label">End</label>
                    <input
                      type="datetime-local"
                      className="mw-input"
                      value={detail.end}
                      onChange={(e) =>
                        setDetail((s) => ({ ...s, end: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}
              {isQuickStart && (
                <div className="mw-info">
                  <div className="mw-info-text">
                    ⚡ Quick Start: Meeting akan langsung dimulai
                  </div>
                </div>
              )}
            </section>
          )}

          {tab === 1 && (
            <section className="mw-pane">
              <div className="mw-help">Tambahkan agenda satu per satu</div>

              <div className="mw-grid">
                <div className="mw-col">
                  <label className="mw-label">Title</label>
                  <input
                    className="mw-input"
                    value={agendaForm.judul}
                    onChange={(e) =>
                      setAgendaForm((s) => ({ ...s, judul: e.target.value }))
                    }
                    placeholder="Opening"
                  />
                </div>
                <div className="mw-col">
                  <label className="mw-label">Start</label>
                  <input
                    type="datetime-local"
                    className="mw-input"
                    value={agendaForm.start}
                    onChange={(e) =>
                      setAgendaForm((s) => ({ ...s, start: e.target.value }))
                    }
                  />
                </div>
                <div className="mw-col">
                  <label className="mw-label">End</label>
                  <input
                    type="datetime-local"
                    className="mw-input"
                    value={agendaForm.end}
                    onChange={(e) =>
                      setAgendaForm((s) => ({ ...s, end: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="mw-row">
                <label className="mw-label">Description</label>
                <textarea
                  className="mw-textarea"
                  rows={2}
                  value={agendaForm.deskripsi}
                  onChange={(e) =>
                    setAgendaForm((s) => ({ ...s, deskripsi: e.target.value }))
                  }
                  placeholder="Optional"
                />
              </div>

              <div className="mw-actions-row">
                <button className="mw-btn" onClick={addAgenda}>
                  Add agenda
                </button>
              </div>

              <div className="mw-list">
                {agendas.length === 0 && (
                  <div className="mw-empty">No agenda added.</div>
                )}
                {agendas.map((a, idx) => (
                  <div className="mw-item" key={a.id}>
                    <div className="mw-item-main">
                      <div className="mw-item-title">{a.judul}</div>
                      <div className="mw-item-sub">
                        {a.start ? new Date(a.start).toLocaleString() : "—"} —{" "}
                        {a.end ? new Date(a.end).toLocaleString() : "—"}
                        {a.deskripsi ? ` · ${a.deskripsi}` : ""}
                      </div>
                    </div>
                    <div className="mw-item-actions">
                      <button
                        className="mw-icon"
                        onClick={() => moveAgenda(a.id, "up")}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        className="mw-icon"
                        onClick={() => moveAgenda(a.id, "down")}
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        className="mw-icon danger"
                        onClick={() => removeAgenda(a.id)}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tab === 2 && (
            <section className="mw-pane">
              <div className="mw-drop" ref={dropRef}>
                <div>Drag & drop files here</div>
                <div className="mw-or">or</div>
                <label className="mw-upload">
                  <input
                    type="file"
                    multiple
                    hidden
                    onChange={onPickMaterials}
                  />
                  Choose files
                </label>
              </div>

              <div className="mw-list">
                {materials.length === 0 && (
                  <div className="mw-empty">No files selected.</div>
                )}
                {materials.map((f, i) => (
                  <div className="mw-item" key={`${f.name}-${i}`}>
                    <div className="mw-item-main">
                      <div className="mw-item-title">{f.name}</div>
                      <div className="mw-item-sub">
                        {(f.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <div className="mw-item-actions">
                      <button
                        className="mw-icon danger"
                        onClick={() => removeMaterial(i)}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>

        {error && <div className="mw-error">{error}</div>}

        <footer className="mw-foot">
          <div className="mw-steps">
            <div className={`mw-step ${tab >= 0 ? "done" : ""}`}>1</div>
            <div className={`mw-step ${tab >= 1 ? "done" : ""}`}>2</div>
            <div className={`mw-step ${tab >= 2 ? "done" : ""}`}>3</div>
          </div>
          <div className="mw-foot-actions">
            <button
              className="mw-btn ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            {tab > 0 && (
              <button
                className="mw-btn"
                onClick={() => setTab(tab - 1)}
                disabled={saving}
              >
                Back
              </button>
            )}
            {tab < 2 && (
              <button
                className="mw-btn primary"
                onClick={() => setTab(tab + 1)}
                disabled={saving}
              >
                Next
              </button>
            )}
            {tab === 2 && (
              <button
                className="mw-btn primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? isQuickStart
                    ? "Starting…"
                    : "Saving…"
                  : isQuickStart
                  ? "Start Meeting"
                  : "Save"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
