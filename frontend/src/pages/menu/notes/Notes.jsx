// src/pages/menu/notes/Notes.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../../components/BottomNav.jsx";
import Icon from "../../../components/Icon.jsx";
import { API_URL } from "../../../config.js";
import "./Notes.css";
import useMeetingGuard from "../../../hooks/useMeetingGuard.js";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import MeetingLayout from "../../../components/MeetingLayout.jsx";
import meetingService from "../../../services/meetingService.js";
import { useMediaRoom } from "../../../contexts/MediaRoomContext.jsx";
// Removed inline screen share usage; viewing is moved to dedicated page

export default function Notes() {
  const [user, setUser] = useState(null);

  // bottom nav
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");

  // notes
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [errNotes, setErrNotes] = useState("");

  // composer
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // editing
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  // Screen sharing UI moved to dedicated page

  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

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

  const meetingId = useMemo(() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || cm?.code || null;
    } catch {
      return null;
    }
  }, []);

  // Screen sharing controls handled elsewhere

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  // Removed global close handler

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingNotes(true);
        setErrNotes("");
        if (!meetingId) {
          setNotes([]); // belum ada meeting
          return;
        }
        const res = await fetch(
          `${API_URL}/api/notes?meetingId=${encodeURIComponent(meetingId)}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...meetingService.getAuthHeaders(),
            },
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const data = Array.isArray(json?.data) ? json.data : [];
        if (!cancel) setNotes(data);
      } catch (e) {
        if (!cancel) setErrNotes(String(e.message || e));
      } finally {
        if (!cancel) setLoadingNotes(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [meetingId]);

  // Fetch menus untuk bottom nav
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
              seq: m.sequenceMenu,
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
    () =>
      (menus || [])
        .filter((m) => (m?.flag ?? "Y") === "Y")
        .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999)),
    [menus]
  );

  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  const resetComposer = () => {
    setTitle("");
    setBody("");
  };

  const handleAdd = async () => {
    const t = title.trim();
    const b = body.trim();
    if (!t && !b) return;
    if (!meetingId) {
      alert("Meeting belum aktif/terpilih.");
      return;
    }
    setSaving(true);
    try {
      const payload = { meetingId, title: t, body: b };
      const res = await fetch(`${API_URL}/api/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const created = json.data;
      setNotes((prev) => [created, ...prev]);
      resetComposer();
    } catch (e) {
      alert(`Gagal menambah catatan: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (n) => {
    setEditingId(n.id);
    setEditTitle(n.title || "");
    setEditBody(n.body || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditBody("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const payload = { title: editTitle.trim(), body: editBody.trim() };
      const res = await fetch(`${API_URL}/api/notes/${editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const updated = json.data;
      setNotes((prev) => prev.map((x) => (x.id === editingId ? updated : x)));
      cancelEdit();
    } catch (e) {
      alert(`Gagal menyimpan: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus catatan ini?")) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/notes/${id}`, {
        method: "DELETE",
        headers: meetingService.getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNotes((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      alert(`Gagal menghapus: ${e.message || e}`);
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
      socket={null} // Will be set when socket is integrated
      mediasoupDevice={null} // MediaSoup will be auto-initialized by simpleScreenShare
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
      <div className="pd-app">
        {/* Top bar */}
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden="true" />
            <div>
              {/* Judul dan subtitle dihilangkan */}
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
                {(user?.username || "US").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="pd-user-name">
                  {user?.username || "Participant"}
                </div>
                <div className="pd-user-role">Participant</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="pd-main">
          {/* Screen share moved to dedicated page */}

          <section className="notes-wrap">
            <div className="notes-header">
              <div className="notes-title">
                <img
                  src="/img/notebook.png"
                  alt="Catatan"
                  className="action-icon"
                />
                <span>Catatan</span>
              </div>
              <div className="notes-actions">
                <button
                  className="note-btn ghost"
                  onClick={() => window.location.reload()}
                  title="Refresh"
                  aria-label="Refresh"
                >
                  <img
                    src="/img/refresh.png"
                    alt="Refresh"
                    className="action-icon"
                  />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Composer */}
            <div className="notes-composer">
              <input
                className="note-input"
                placeholder="Judul catatan"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                className="note-textarea"
                placeholder="Tuliskan catatan…"
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <div className="notes-composer-actions">
                <button
                  className="note-btn primary"
                  onClick={handleAdd}
                  disabled={saving || (!title.trim() && !body.trim())}
                >
                  <SaveIcon />
                  <span>Simpan</span>
                </button>
                {(title || body) && (
                  <button
                    className="note-btn"
                    onClick={resetComposer}
                    disabled={saving}
                  >
                    <ClearIcon />
                    <span>Bersihkan</span>
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            {loadingNotes && <div className="pd-empty">Memuat catatan…</div>}
            {errNotes && !loadingNotes && (
              <div className="pd-error">Gagal memuat catatan: {errNotes}</div>
            )}

            {!loadingNotes && !errNotes && (
              <>
                {notes.length === 0 ? (
                  <div className="pd-empty">Belum ada catatan.</div>
                ) : (
                  <div className="notes-grid">
                    {notes.map((n) =>
                      editingId === n.id ? (
                        <div className="note-card editing" key={n.id}>
                          <input
                            className="note-input"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Judul catatan"
                          />
                          <textarea
                            className="note-textarea"
                            rows={4}
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            placeholder="Isi catatan…"
                          />
                          <div className="note-meta">
                            <span>Diedit sekarang</span>
                          </div>
                          <div className="note-actions">
                            <button
                              className="note-btn primary"
                              onClick={saveEdit}
                              disabled={saving}
                            >
                              <SaveIcon />
                              <span>Simpan</span>
                            </button>
                            <button
                              className="note-btn"
                              onClick={cancelEdit}
                              disabled={saving}
                            >
                              <CancelIcon />
                              <span>Batal</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="note-card" key={n.id}>
                          <div className="note-title">
                            {n.title || "Untitled"}
                          </div>
                          <div className="note-body">
                            {n.body || <i>(tanpa isi)</i>}
                          </div>
                          <div className="note-meta">
                            <span>{formatDate(n.updatedAt)}</span>
                            {n.author ? <span> · {n.author}</span> : null}
                          </div>
                          <div className="note-actions">
                            <button
                              className="note-btn"
                              onClick={() => startEdit(n)}
                              disabled={saving}
                              aria-label="Edit"
                            >
                              <img
                                src="/img/edit.png"
                                alt="Edit"
                                className="action-icon"
                              />
                              <span>Edit</span>
                            </button>

                            <button
                              className="note-btn danger"
                              onClick={() => handleDelete(n.id)}
                              disabled={saving}
                              aria-label="Hapus"
                            >
                              <img
                                src="/img/delete.png"
                                alt="Hapus"
                                className="action-icon"
                              />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </main>

        {/* Bottom nav dari DB */}
        {!loadingMenus && !errMenus && (
          <BottomNav
            items={visibleMenus}
            active="note"
            onSelect={handleSelectNav}
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

/* Utils */
function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/* Ikon kecil */
function SaveIcon() {
  return (
    <svg
      className="pd-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21V9H7v12" />
      <path d="M7 3v6h8" />
    </svg>
  );
}
function ClearIcon() {
  return (
    <svg
      className="pd-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg
      className="pd-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg
      className="pd-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
function CancelIcon() {
  return (
    <svg
      className="pd-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg
      className="pd-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-9-9" />
      <path d="M3 12l3-3 3 3" />
      <path d="M21 12l-3 3-3-3" />
    </svg>
  );
}
