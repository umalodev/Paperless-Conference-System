import React, { useEffect, useState, useMemo, useCallback } from "react";
import BottomNav from "../../../components/BottomNav.jsx";
import "../../menu/agenda/Agenda.css";
import { API_URL } from "../../../config.js";
import { useNavigate } from "react-router-dom";
import Icon from "../../../components/Icon.jsx";
import useMeetingGuard from "../../../hooks/useMeetingGuard.js";

export default function Agenda() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [agendas, setAgendas] = useState([]);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [agendaErr, setAgendaErr] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [form, setForm] = useState({
    judul: "",
    deskripsi: "",
    date: "", // yyyy-mm-dd
    start: "", // HH:MM
    end: "", // HH:MM
  });

  const navigate = useNavigate();

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    const dn = localStorage.getItem("pconf.displayName") || "";
    setDisplayName(dn);
  }, []);

  // Ambil meetingId dari localStorage (dibuat di Start saat create/join)
  const meetingId = useMemo(() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || null;
    } catch {
      return null;
    }
  }, []);

  // ----- MENUS -----
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${API_URL}/api/menu/user/menus`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = Array.isArray(json?.data)
          ? json.data.map((m) => ({
              slug: m.slug,
              label: m.displayLabel,
              flag: m.flag ?? "Y",
              iconUrl: m.iconMenu || null,
            }))
          : [];
        if (!cancel) setMenus(list);
      } catch (e) {
        if (!cancel) setErr(String(e.message || e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const visibleMenus = useMemo(
    () => (menus || []).filter((m) => (m?.flag ?? "Y") === "Y"),
    [menus]
  );

  const handleSelect = (item) => navigate(`/menu/${item.slug}`);

  // ----- AGENDAS -----
  const loadAgendas = useCallback(async () => {
    setAgendaLoading(true);
    setAgendaErr("");
    try {
      const qs = meetingId ? `?meetingId=${encodeURIComponent(meetingId)}` : "";
      const res = await fetch(`${API_URL}/api/agendas${qs}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items = Array.isArray(json?.data)
        ? json.data.map((it) => ({
            id: it.meetingAgendaId || it.meeting_agenda_id || it.id,
            title: it.judul,
            start: it.startTime || it.start_time,
            end: it.endTime || it.end_time,
            desc: it.deskripsi || "<deskripsi kosong>",
          }))
        : [];
      setAgendas(items);
    } catch (e) {
      setAgendaErr(String(e.message || e));
    } finally {
      setAgendaLoading(false);
    }
  }, [API_URL, meetingId]);

  useEffect(() => {
    loadAgendas();
  }, [loadAgendas]);

  // ----- ADD AGENDA -----
  const canCreate = !!meetingId;

  const openAdd = () => {
    setFormErr("");
    setShowAdd(true);
  };
  const closeAdd = () => {
    setShowAdd(false);
    setSaving(false);
    setFormErr("");
    setForm({ judul: "", deskripsi: "", date: "", start: "", end: "" });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const toISO = (dateStr, timeStr) => {
    // Kirim sebagai local time ISO
    // "2025-08-26" + "09:00" -> new Date("2025-08-26T09:00")
    return new Date(`${dateStr}T${timeStr}`);
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    setFormErr("");

    if (!canCreate) {
      setFormErr("Meeting belum ada. Buat/Join meeting dulu.");
      return;
    }
    if (!form.judul.trim()) {
      setFormErr("Judul wajib diisi.");
      return;
    }
    if (!form.date || !form.start || !form.end) {
      setFormErr("Tanggal, jam mulai, dan jam selesai wajib diisi.");
      return;
    }
    const startDate = toISO(form.date, form.start);
    const endDate = toISO(form.date, form.end);
    if (!(startDate < endDate)) {
      setFormErr("Jam selesai harus lebih besar dari jam mulai.");
      return;
    }

    try {
      setSaving(true);
      const body = {
        meetingId,
        judul: form.judul.trim(),
        deskripsi: form.deskripsi?.trim() || null,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        seq: agendas.length + 1,
      };
      const res = await fetch(`${API_URL}/api/agendas`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t?.message || `HTTP ${res.status}`);
      }
      await loadAgendas();
      closeAdd();
    } catch (e) {
      setFormErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  };

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  return (
    <div className="pd-app">
      {/* Top bar */}
      <header className="pd-topbar">
        <div className="pd-left">
          <span className="pd-live" aria-hidden />
          <div>
            <h1 className="pd-title">Test Meeting</h1>
          </div>
        </div>
        <div className="pd-right">
          <div className="pd-clock" aria-live="polite">
            {new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div className="pd-user">
            <div className="pd-avatar">
              {(displayName || user?.username || "DL")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <div className="pd-user-name">
                {displayName || user?.username || "David Li"}
              </div>
              <div className="pd-user-role">#FC114</div>
            </div>
          </div>
        </div>
      </header>

      {/* Konten utama */}
      <main className="pd-main">
        <section className="agenda-wrap">
          <div className="agenda-header">
            <span className="agenda-title">Agenda</span>

            <button
              className="agenda-add"
              title={canCreate ? "Add agenda" : "Create/Join a meeting first"}
              onClick={canCreate ? openAdd : undefined}
              disabled={!canCreate}
            >
              <Icon slug="plus" />
            </button>
          </div>

          {/* Add form (inline) */}
          {showAdd && (
            <form className="agenda-form" onSubmit={submitAdd}>
              <div className="af-row">
                <label className="af-label">Judul</label>
                <input
                  name="judul"
                  className="af-input"
                  placeholder="Contoh: Pembukaan"
                  value={form.judul}
                  onChange={handleFormChange}
                />
              </div>

              <div className="af-row">
                <label className="af-label">Deskripsi</label>
                <textarea
                  name="deskripsi"
                  className="af-textarea"
                  rows={2}
                  placeholder="Opsional"
                  value={form.deskripsi}
                  onChange={handleFormChange}
                />
              </div>

              <div className="af-grid">
                <div className="af-col">
                  <label className="af-label">Tanggal</label>
                  <input
                    type="date"
                    name="date"
                    className="af-input"
                    value={form.date}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="af-col">
                  <label className="af-label">Mulai</label>
                  <input
                    type="time"
                    name="start"
                    className="af-input"
                    value={form.start}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="af-col">
                  <label className="af-label">Selesai</label>
                  <input
                    type="time"
                    name="end"
                    className="af-input"
                    value={form.end}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              {formErr && (
                <div className="pd-error" style={{ marginTop: 8 }}>
                  {formErr}
                </div>
              )}

              <div className="af-actions">
                <button
                  type="button"
                  className="pd-ghost"
                  onClick={closeAdd}
                  disabled={saving}
                >
                  Batal
                </button>
                <button type="submit" className="pd-danger" disabled={saving}>
                  {saving ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </form>
          )}

          <div className="agenda-list">
            {agendaLoading && <div className="pd-empty">Loading agendas…</div>}
            {agendaErr && !agendaLoading && (
              <div className="pd-error">Gagal memuat agenda: {agendaErr}</div>
            )}
            {!agendaLoading && !agendaErr && agendas.length === 0 && (
              <div className="pd-empty">Belum ada agenda.</div>
            )}
            {!agendaLoading &&
              !agendaErr &&
              agendas.map((a) => (
                <AgendaItem
                  key={a.id}
                  id={a.id}
                  title={a.title}
                  time={formatRange(a.start, a.end)}
                  desc={a.desc}
                />
              ))}
          </div>
        </section>
      </main>

      {/* Bottom nav dari API */}
      {!loading && !err && (
        <BottomNav
          items={visibleMenus}
          active="agenda"
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}

function AgendaItem({ id, title, time, desc }) {
  const [open, setOpen] = React.useState(false);
  const hasDesc = !!desc && desc.trim().length > 0;

  const toggle = () => {
    if (hasDesc) setOpen((v) => !v);
  };

  return (
    <div className={`agenda-item ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="agenda-toggle"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`agenda-desc-${id}`}
        disabled={!hasDesc}
        title={hasDesc ? "Lihat deskripsi" : "Tidak ada deskripsi"}
      >
        <div className="agenda-left">
          <span className="agenda-dot" aria-hidden />
          <span className="agenda-item-title">{title}</span>
        </div>
        <div className="agenda-right">
          <span className="agenda-time">{time}</span>

          {hasDesc && (
            <span className="agenda-caret" aria-hidden>
              ▾
            </span>
          )}
        </div>
      </button>

      {hasDesc && (
        <div
          id={`agenda-desc-${id}`}
          className="agenda-desc"
          role="region"
          aria-label={`Deskripsi ${title}`}
        >
          {desc}
        </div>
      )}
    </div>
  );
}

function formatRange(start, end) {
  if (!start || !end) return "-";
  const s = new Date(start);
  const e = new Date(end);
  const f = (d) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${f(s)} - ${f(e)}`;
}
