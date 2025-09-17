import React, { useEffect, useState, useMemo, useCallback } from "react";
import BottomNav from "../../../components/BottomNav.jsx";
import { API_URL } from "../../../config.js";
import { useNavigate } from "react-router-dom";
import Icon from "../../../components/Icon.jsx";
import useMeetingGuard from "../../../hooks/useMeetingGuard.js";
import "./Agenda.css";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import MeetingLayout from "../../../components/MeetingLayout.jsx";
import meetingService from "../../../services/meetingService.js";

export default function Agenda() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");

  // bottom nav
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // current meeting agendas
  const [agendas, setAgendas] = useState([]);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [agendaErr, setAgendaErr] = useState("");

  // add form
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [form, setForm] = useState({
    judul: "",
    deskripsi: "",
    date: "",
    start: "",
    end: "",
  });

  // history
  const [showHistory, setShowHistory] = useState(false);
  const [historyGroups, setHistoryGroups] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyErr, setHistoryErr] = useState("");

  const isHost = /^(host|admin)$/i.test(user?.role || "");

  const navigate = useNavigate();

  const meetingId = useMemo(() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    const dn = localStorage.getItem("pconf.displayName") || "";
    setDisplayName(dn);
  }, []);

  // end meeting handler
  useEffect(() => {
    const handleMeetingEnd = () => {
      localStorage.removeItem("currentMeeting");
      navigate("/start");
    };
    window.addEventListener("meeting-ended", handleMeetingEnd);
    return () => window.removeEventListener("meeting-ended", handleMeetingEnd);
  }, [navigate]);

  // ----- MENUS -----
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${API_URL}/api/menu/user/menus`, {
          headers: meetingService.getAuthHeaders(),
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

  // ----- LOAD AGENDAS (current meeting) -----
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
            desc: it.deskripsi || "",
          }))
        : [];
      setAgendas(items);
    } catch (e) {
      setAgendaErr(String(e.message || e));
    } finally {
      setAgendaLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    loadAgendas();
  }, [loadAgendas]);

  // ----- LOAD HISTORY (group by meeting) -----
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryErr("");
    try {
      const url = new URL(`${API_URL}/api/agendas/history`);
      if (meetingId) url.searchParams.set("excludeMeetingId", meetingId);
      url.searchParams.set("limit", "30");
      url.searchParams.set("withAgendasOnly", "1");

      const res = await fetch(url.toString(), {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const groups = Array.isArray(json?.data)
        ? json.data.map((g) => ({
            meetingId: g.meetingId,
            title: g.title,
            startTime: g.startTime,
            endTime: g.endTime,
            status: g.status,
            agendas: (g.agendas || []).map((a) => ({
              id: a.id,
              judul: a.judul,
              deskripsi: a.deskripsi || "",
              startTime: a.startTime || a.start_time,
              endTime: a.endTime || a.end_time,
              seq: a.seq,
            })),
          }))
        : [];
      setHistoryGroups(groups);
    } catch (e) {
      setHistoryErr(String(e.message || e));
    } finally {
      setHistoryLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    if (showHistory) loadHistory();
  }, [showHistory, loadHistory]);

  // ----- ADD AGENDA -----
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
  const toISO = (dateStr, timeStr) => new Date(`${dateStr}T${timeStr}`);

  const submitAdd = async (e) => {
    e.preventDefault();
    setFormErr("");

    if (!meetingId) return setFormErr("Meeting belum ada. Buat/Join dulu.");
    if (!form.judul.trim()) return setFormErr("Judul wajib diisi.");
    if (!form.date || !form.start || !form.end)
      return setFormErr("Tanggal, jam mulai, dan jam selesai wajib diisi.");

    const startDate = toISO(form.date, form.start);
    const endDate = toISO(form.date, form.end);
    if (!(startDate < endDate))
      return setFormErr("Jam selesai harus lebih besar dari jam mulai.");

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
    <MeetingLayout
      meetingId={meetingId}
      userId={user?.id}
      userRole={user?.role || "participant"}
      socket={null}
      mediasoupDevice={null}
    >
      <div className="pd-app agenda-page">
        {/* Top bar */}
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <div>
              <h1 className="pd-title">Agenda Meeting</h1>
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

        {/* Content */}
        <main className="pd-main">
          <section className="agenda-wrap">
            <div className="agenda-header">
              <span className="agenda-title">Agenda</span>

              <div className="agenda-actions">
                <button
                  className={`ag-btn ${showHistory ? "active" : ""}`}
                  onClick={() => setShowHistory((s) => !s)}
                >
                  <Icon slug="history" />{" "}
                  {showHistory ? "Tutup Riwayat" : "Riwayat"}
                </button>

                {isHost && (
                  <button
                    className="agenda-add"
                    title="Tambah agenda"
                    onClick={openAdd}
                  >
                    <Icon slug="plus" />
                  </button>
                )}
              </div>
            </div>

            {/* Add form */}
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

                {formErr && <div className="pd-error mt-8">{formErr}</div>}

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

            {/* Current agendas */}
            <div className="agenda-list">
              {agendaLoading && (
                <div className="pd-empty">Loading agendas…</div>
              )}
              {agendaErr && !agendaLoading && (
                <div className="pd-error">Gagal memuat agenda: {agendaErr}</div>
              )}
              {!agendaLoading && !agendaErr && agendas.length === 0 && (
                <div
                  className="ag-empty"
                  role="region"
                  aria-label="Keadaan kosong agenda"
                >
                  <div className="ag-empty-icon">
                    <Icon slug="calendar" />
                  </div>
                  <div className="ag-empty-copy">
                    <div className="ag-empty-title">Belum ada agenda</div>
                    <div className="ag-empty-desc">
                      Mulai dengan menambahkan item agenda agar peserta
                      mengetahui alur meeting.
                    </div>
                  </div>
                  {isHost && (
                    <div className="ag-empty-actions">
                      <button className="pd-danger" onClick={openAdd}>
                        <Icon slug="plus" /> Tambah Agenda
                      </button>
                    </div>
                  )}
                </div>
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

            {/* History panel */}
            {showHistory && (
              <>
                <div className="ag-divider" />
                <section className="ag-history">
                  <h3 className="ag-history-title">
                    <Icon slug="history" /> Riwayat Agenda{" "}
                    <span className="ag-chip ghost">
                      {historyGroups.length} meeting
                    </span>
                  </h3>

                  {historyLoading && (
                    <div className="pd-empty">Memuat riwayat…</div>
                  )}
                  {historyErr && !historyLoading && (
                    <div className="pd-error">
                      Gagal memuat riwayat: {historyErr}
                    </div>
                  )}
                  {!historyLoading &&
                    !historyErr &&
                    historyGroups.length === 0 && (
                      <div className="pd-empty">Belum ada riwayat agenda.</div>
                    )}

                  {!historyLoading &&
                    !historyErr &&
                    historyGroups.length > 0 && (
                      <div className="ag-accordion">
                        {historyGroups.map((g) => (
                          <AgendaHistoryGroup key={g.meetingId} group={g} />
                        ))}
                      </div>
                    )}
                </section>
              </>
            )}
          </section>
        </main>

        {/* Bottom nav */}
        {!loading && !err && (
          <BottomNav
            items={visibleMenus}
            active="agenda"
            onSelect={handleSelect}
          />
        )}

        <MeetingFooter userRole={user?.role || "participant"} />
      </div>
    </MeetingLayout>
  );
}

function AgendaHistoryGroup({ group }) {
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
          <div className="ag-acc-meta">
            {formatDateRange(startTime, endTime)}
          </div>
        </div>
        <div className="ag-acc-count">
          <Icon slug="calendar" />
          {agendas?.length || 0}
        </div>
      </button>

      {open && (
        <div className="ag-acc-body">
          {(!agendas || agendas.length === 0) && (
            <div className="pd-empty">Tidak ada agenda.</div>
          )}
          {agendas &&
            agendas.length > 0 &&
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
function formatDateRange(a, b) {
  try {
    const s = a ? new Date(a) : null;
    const e = b ? new Date(b) : null;
    const fmt = (d) =>
      d.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    if (s && e) return `${fmt(s)} – ${fmt(e)}`;
    if (s) return fmt(s);
    if (e) return fmt(e);
    return "—";
  } catch {
    return "—";
  }
}
