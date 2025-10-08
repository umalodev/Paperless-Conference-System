// src/pages/menu/agenda/Agenda.jsx
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
import { useMediaRoom } from "../../../contexts/MediaRoomContext.jsx";

export default function Agenda() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");

  // nav menu
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");

  // agendas (current meeting)
  const [agendas, setAgendas] = useState([]);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [agendaErr, setAgendaErr] = useState("");

  // add / edit form
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
  const [editing, setEditing] = useState(null); // { id } | null

  // history
  const [showHistory, setShowHistory] = useState(false);
  const [historyGroups, setHistoryGroups] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyErr, setHistoryErr] = useState("");

  const isHost = /^(host|admin)$/i.test(user?.role || "");
  const navigate = useNavigate();

  // meetingId dari localStorage
  const meetingId = useMemo(() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || cm?.code || null;
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

  // jika meeting diakhiri dari tempat lain
  useEffect(() => {
    const handleMeetingEnd = () => {
      localStorage.removeItem("currentMeeting");
      navigate("/start");
    };
    window.addEventListener("meeting-ended", handleMeetingEnd);
    return () => window.removeEventListener("meeting-ended", handleMeetingEnd);
  }, [navigate]);

  const {
    ready: mediaReady,
    error: mediaError,
    micOn,
    camOn,
    startMic,
    stopMic,
    startCam,
    stopCam,
    muteAllOthers,
  } = useMediaRoom();

  const onToggleMic = useCallback(() => {
    if (!mediaReady) return;
    micOn ? stopMic() : startMic();
  }, [mediaReady, micOn, startMic, stopMic]);

  const onToggleCam = useCallback(() => {
    if (!mediaReady) return;
    camOn ? stopCam() : startCam();
  }, [mediaReady, camOn, startCam, stopCam]);

  // ================== MENUS ==================
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingMenus(true);
        setErrMenus("");
        const res = await fetch(`${API_URL}/api/menu/user/menus`, {
          headers: meetingService.getAuthHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = Array.isArray(json?.data)
          ? json.data.map((m) => ({
              menuId: m.menuId,
              slug: m.slug,
              label: m.displayLabel,
              flag: m.flag ?? "Y",
              iconUrl: m.iconMenu || null,
            }))
          : [];
        if (!cancel) setMenus(list);
      } catch (e) {
        if (!cancel) setErrMenus(String(e.message || e));
      } finally {
        if (!cancel) setLoadingMenus(false);
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

  // helpers tanggal / jam
  const pad = (n) => String(n).padStart(2, "0");
  const toDateInputValue = (iso) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const toTimeInputValue = (iso) => {
    const d = new Date(iso);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const loadAgendas = useCallback(async () => {
    setAgendaLoading(true);
    setAgendaErr("");
    try {
      const qs = meetingId ? `?meetingId=${encodeURIComponent(meetingId)}` : "";
      const res = await fetch(`${API_URL}/api/agendas${qs}`, {
        headers: meetingService.getAuthHeaders(),
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

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryErr("");
    try {
      const url = new URL(`${API_URL}/api/agendas/history`);
      if (meetingId) url.searchParams.set("excludeMeetingId", meetingId);
      url.searchParams.set("limit", "30");
      url.searchParams.set("withAgendasOnly", "0");

      const res = await fetch(url.toString(), {
        headers: meetingService.getAuthHeaders(),
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

      groups.sort((a, b) => {
        const da = a.startTime ? new Date(a.startTime).getTime() : 0;
        const db = b.startTime ? new Date(b.startTime).getTime() : 0;
        return db - da;
      });
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

  const openAdd = () => {
    setEditing(null);
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

  const submitAdd = async (e) => {
    e.preventDefault();
    setFormErr("");

    if (!meetingId) return setFormErr("Meeting belum ada. Buat/Join dulu.");
    if (!form.judul.trim()) return setFormErr("Judul wajib diisi.");
    if (!form.date || !form.start || !form.end)
      return setFormErr("Tanggal, jam mulai, dan jam selesai wajib diisi.");

    const startDate = new Date(`${form.date}T${form.start}`);
    const endDate = new Date(`${form.date}T${form.end}`);
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
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
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

  const openEdit = (a) => {
    setShowAdd(false);
    setFormErr("");
    setEditing({ id: a.id });
    setForm({
      judul: a.title || "",
      deskripsi: a.desc || "",
      date: toDateInputValue(a.start),
      start: toTimeInputValue(a.start),
      end: toTimeInputValue(a.end),
    });
  };
  const closeEdit = () => {
    setEditing(null);
    setSaving(false);
    setFormErr("");
    setForm({ judul: "", deskripsi: "", date: "", start: "", end: "" });
  };
  const submitEdit = async (e) => {
    e.preventDefault();
    setFormErr("");

    if (!editing?.id) return setFormErr("Data agenda tidak valid.");
    if (!form.judul.trim()) return setFormErr("Judul wajib diisi.");
    if (!form.date || !form.start || !form.end)
      return setFormErr("Tanggal, jam mulai, dan jam selesai wajib diisi.");

    const startDate = new Date(`${form.date}T${form.start}`);
    const endDate = new Date(`${form.date}T${form.end}`);
    if (!(startDate < endDate))
      return setFormErr("Jam selesai harus lebih besar dari jam mulai.");

    try {
      setSaving(true);
      const body = {
        judul: form.judul.trim(),
        deskripsi: form.deskripsi?.trim() || null,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
      };
      const res = await fetch(
        `${API_URL}/api/agendas/${encodeURIComponent(editing.id)}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
            ...meetingService.getAuthHeaders(),
          },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t?.message || `HTTP ${res.status}`);
      }
      await loadAgendas();
      closeEdit();
    } catch (e) {
      setFormErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAgenda = async (id) => {
    if (!id) return;
    if (!confirm("Hapus agenda ini?")) return;
    try {
      const res = await fetch(
        `${API_URL}/api/agendas/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: meetingService.getAuthHeaders(),
        }
      );
      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t?.message || `HTTP ${res.status}`);
      }
      await loadAgendas();
    } catch (e) {
      alert(`Gagal menghapus: ${e.message || e}`);
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
      meetingTitle={(() => {
        try {
          const raw = localStorage.getItem("currentMeeting");
          const cm = raw ? JSON.parse(raw) : null;
          return cm?.title || `Meeting #${meetingId}`;
        } catch {
          return `Meeting #${meetingId}`;
        }
      })()}
    >
      <div className="pd-app agenda-page">
        {/* Top bar */}
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <div>
              <h1 className="pd-title">
                {localStorage.getItem("currentMeeting")
                  ? JSON.parse(localStorage.getItem("currentMeeting"))?.title ||
                    "Meeting Default"
                  : "Default"}
              </h1>
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
                {(displayName || user?.username || "US")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <div className="pd-user-name">
                  {displayName || user?.username || "Participant"}
                </div>
                <div className="pd-user-role">
                  {user?.role || "Participant"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="pd-main">
          <section className="agenda-wrap">
            <div className="agenda-header">
              <div className="agenda-title">
                <img
                  src="/img/Agenda1.png"
                  alt=""
                  aria-hidden="true"
                  className="ag-title-icon"
                />
                <span className="ag-title-text">Agenda</span>
              </div>

              <div className="agenda-actions">
                <button
                  className={`ag-btn ${showHistory ? "active" : ""}`}
                  onClick={() => setShowHistory((s) => !s)}
                >
                  <img src="/img/history.png" alt="" className="history-icon" />
                  {showHistory ? "Tutup Riwayat" : "Riwayat"}
                </button>

                {isHost && (
                  <button
                    className="agenda-add"
                    title="Tambah agenda"
                    onClick={openAdd}
                  >
                    <img
                      src="/img/add1.png"
                      alt="Tambah agenda"
                      className="action-icon"
                    />
                  </button>
                )}
              </div>
            </div>

            {/* ADD FORM */}
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

            {/* EDIT FORM */}
            {editing && (
              <form className="agenda-form" onSubmit={submitEdit}>
                <div className="af-row">
                  <label className="af-label">Judul</label>
                  <input
                    name="judul"
                    className="af-input"
                    placeholder="Judul agenda"
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
                    onClick={closeEdit}
                    disabled={saving}
                  >
                    Batal
                  </button>
                  <button type="submit" className="pd-danger" disabled={saving}>
                    {saving ? "Menyimpan…" : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            )}

            {/* ================== CURRENT AGENDAS ================== */}
            {agendaLoading && <AgendaSkeletonList />}

            {agendaErr && !agendaLoading && (
              <div className="pd-error">Gagal memuat agenda: {agendaErr}</div>
            )}

            {!agendaLoading && !agendaErr && agendas.length === 0 && (
              <div className="ag-empty">
                <div className="ag-empty-icon">🗒️</div>
                <div className="ag-empty-copy">
                  <div className="ag-empty-title">Belum ada agenda</div>
                </div>
                {/* ag-empty-actions dihapus agar tombol merah tidak muncul */}
              </div>
            )}

            {!agendaLoading && !agendaErr && agendas.length > 0 && (
              <div className="agenda-list">
                {agendas.map((a) => (
                  <AgendaItem
                    key={a.id}
                    id={a.id}
                    title={a.title}
                    time={formatRange(a.start, a.end)}
                    desc={a.desc}
                    canEdit={isHost}
                    onEdit={() => openEdit(a)}
                    onDelete={() => handleDeleteAgenda(a.id)}
                  />
                ))}
              </div>
            )}

            {/* ================== HISTORY ================== */}
            {showHistory && (
              <>
                <div className="ag-divider" />
                <section className="ag-history">
                  <h3 className="ag-history-title">
                    <img
                      src="/img/history.png"
                      alt=""
                      className="history-icon"
                    />
                    Riwayat Agenda
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

            {errMenus && (
              <div className="pd-error" style={{ marginTop: 12 }}>
                Gagal memuat menu: {errMenus}
              </div>
            )}
          </section>
        </main>

        {/* Bottom nav */}
        {!loadingMenus && !errMenus && (
          <BottomNav
            items={visibleMenus}
            active="agenda"
            onSelect={handleSelect}
          />
        )}

        <MeetingFooter
          userRole={user?.role || "participant"}
          micOn={micOn}
          camOn={camOn}
          onToggleMic={onToggleMic}
          onToggleCam={onToggleCam}
        />
      </div>
    </MeetingLayout>
  );
}

/* ================== SUB COMPONENTS ================== */

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

function AgendaItem({ id, title, time, desc, canEdit, onEdit, onDelete }) {
  const [open, setOpen] = React.useState(false);
  const hasDesc = !!desc && desc.trim().length > 0;
  const toggle = () => hasDesc && setOpen((v) => !v);

  return (
    <div className={`agenda-item ${open ? "is-open" : ""}`}>
      {/* Row atas: judul + ikon kecil (kiri), waktu + caret (kanan) */}
      <div className="agenda-row">
        <div className="agenda-left">
          <button
            type="button"
            className="agenda-title-btn"
            onClick={toggle}
            aria-expanded={open}
            aria-controls={`agenda-desc-${id}`}
            disabled={!hasDesc}
            title={hasDesc ? "Lihat deskripsi" : "Tidak ada deskripsi"}
          >
            <span className="agenda-dot" aria-hidden />
            <span className="agenda-item-title">{title}</span>
          </button>

          {/* ikon kecil edit/hapus tepat di samping judul */}
          {canEdit && (
            <div className="agenda-inline-actions">
              <button
                type="button"
                className="ag-icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit && onEdit();
                }}
                title="Edit agenda"
                aria-label="Edit agenda"
              >
                <img src="/img/edit.png" alt="" className="ag-icon-img" />
              </button>
              <button
                type="button"
                className="ag-icon-btn danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete && onDelete();
                }}
                title="Hapus agenda"
                aria-label="Hapus agenda"
              >
                <img src="/img/delete.png" alt="" className="ag-icon-img" />
              </button>
            </div>
          )}
        </div>

        <div className="agenda-right">
          <span className="agenda-time">{time}</span>
          {hasDesc && (
            <button
              type="button"
              className={`agenda-caret-btn ${open ? "is-open" : ""}`}
              aria-label={
                open ? "Sembunyikan deskripsi" : "Tampilkan deskripsi"
              }
              onClick={toggle}
            >
              ▾
            </button>
          )}
        </div>
      </div>

      {/* Deskripsi di bawah */}
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

/* Skeleton shimmer saat loading */
function AgendaSkeletonList() {
  return (
    <div className="agenda-skeleton">
      {Array.from({ length: 3 }).map((_, i) => (
        <div className="ag-sk-row" key={i}>
          <span className="ag-sk-dot" />
          <span className="ag-sk-line w-60" />
          <span className="ag-sk-line w-20 right" />
        </div>
      ))}
    </div>
  );
}

/* ================== utils ================== */

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
