// src/pages/menu/materials/Materials.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../../components/BottomNav.jsx";
import Icon from "../../../components/Icon.jsx";
import "./materials.css";
import { API_URL } from "../../../config.js";
import useMeetingGuard from "../../../hooks/useMeetingGuard.js";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import MeetingLayout from "../../../components/MeetingLayout.jsx";
import meetingService from "../../../services/meetingService.js";
import { useMediaRoom } from "../../../contexts/MediaRoomContext.jsx";

export default function Materials() {
  const [user, setUser] = useState(null);

  // bottom nav
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");

  // materials (current meeting)
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [errItems, setErrItems] = useState("");

  // upload
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // history
  const [showHistory, setShowHistory] = useState(false);
  const [historyGroups, setHistoryGroups] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errHistory, setErrHistory] = useState("");

  const navigate = useNavigate();

  // role
  const isHost = /^(host|admin)$/i.test(user?.role || "");

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

  // meeting id
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
  }, []);

  const authHeaders = useMemo(() => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const absolutize = (u) => {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    const base = String(API_URL || "").replace(/\/+$/, "");
    const p = `/${String(u).replace(/^\/+/, "")}`;
    return `${base}${p}`;
  };

  // ====== menus ======
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
              slug: m.slug,
              label: m.displayLabel,
              iconUrl: m.iconMenu || null,
              flag: m.flag ?? "Y",
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
  }, [authHeaders]);

  const visibleMenus = useMemo(
    () =>
      (menus || [])
        .filter((m) => (m?.flag ?? "Y") === "Y")
        .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999)),
    [menus]
  );
  const handleSelect = (item) => navigate(`/menu/${item.slug}`);

  // ====== load materials ======
  const loadMaterials = async () => {
    if (!meetingId) {
      setItems([]);
      setErrItems("Meeting belum dipilih/aktif");
      setLoadingItems(false);
      return;
    }
    setLoadingItems(true);
    setErrItems("");
    try {
      const res = await fetch(
        `${API_URL}/api/materials/meeting/${encodeURIComponent(meetingId)}`,
        { credentials: "include", headers: { ...authHeaders } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const arr = Array.isArray(json?.data) ? json.data : [];
      const list = arr.map((x) => ({
        id: x.id,
        path: x.path,
        url: absolutize(x.url || x.path),
        name: guessName(x.path),
        createdAt: x.createdAt || x.created_at,
      }));
      setItems(list);
    } catch (e) {
      setErrItems(String(e.message || e));
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    loadMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  // ====== history ======
  const loadHistory = async () => {
    setLoadingHistory(true);
    setErrHistory("");
    try {
      const url = new URL(`${API_URL}/api/materials/history`);
      if (meetingId) url.searchParams.set("excludeMeetingId", meetingId);
      url.searchParams.set("limit", "30");
      url.searchParams.set("withMaterialsOnly", "0");

      const res = await fetch(url.toString(), {
        headers: meetingService.getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const arr = Array.isArray(json?.data) ? json.data : [];

      const groups = arr.map((g) => ({
        meetingId: g.meetingId,
        title: g.title,
        startTime: g.startTime,
        endTime: g.endTime,
        status: g.status,
        materials: (g.materials || []).map((x) => ({
          id: x.id,
          path: x.path,
          url: absolutize(x.url || x.path),
          name: guessName(x.path),
          createdAt: x.created_at || x.createdAt,
        })),
      }));
      groups.sort((a, b) => {
        const da = a.startTime ? new Date(a.startTime).getTime() : 0;
        const db = b.startTime ? new Date(b.startTime).getTime() : 0;
        return db - da;
      });
      setHistoryGroups(groups);
    } catch (e) {
      setErrHistory(String(e.message || e));
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showHistory) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistory]);

  // ====== upload ======
  const onClickUpload = () => fileRef.current?.click();

  const onFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !meetingId) return;
    setUploading(true);
    try {
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch(
          `${API_URL}/api/materials/upload/${encodeURIComponent(meetingId)}`,
          {
            method: "POST",
            body: fd,
            credentials: "include",
            headers: { ...authHeaders },
          }
        );
        if (!res.ok) {
          const t = await res.json().catch(() => ({}));
          throw new Error(t?.message || `Upload gagal (HTTP ${res.status})`);
        }
      }
      await loadMaterials();
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setUploading(false);
      e.target.value = ""; // reset input
    }
  };

  // ====== preview & download (ALA Files.jsx) ======
  const handlePreview = (it) => {
    const abs = it?.url || absolutize(it?.path);
    if (!abs) return;
    window.open(abs, "_blank", "noopener,noreferrer");
  };

  const handleDownload = (it) => {
    const abs = it?.url || absolutize(it?.path);
    if (!abs) return;
    const a = document.createElement("a");
    a.href = abs;
    a.download = it?.name || "file";
    a.rel = "noopener";
    a.click();
  };

  // ====== delete ======
  const handleDelete = async (it) => {
    if (!confirm(`Hapus material "${it.name}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/materials/${it.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { ...authHeaders },
      });
      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t?.message || `HTTP ${res.status}`);
      }
      await loadMaterials();
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
    >
      <div className="pd-app">
        {/* Top bar */}
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <div>
              <h1 className="pd-title">Materials</h1>
              <div className="pd-sub">All meeting files</div>
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
          <section className="mtl-wrap">
            <div className="mtl-header">
              <div className="mtl-title">
                <img
                  src="/img/Materials1.png"
                  alt=""
                  className="mtl-title-icon"
                />
                <span className="mtl-title-text">Materials</span>
              </div>

              {/* Actions */}
              <div className="mtl-actions">
                {isHost && (
                  <button
                    className="mtl-btn"
                    onClick={onClickUpload}
                    disabled={!meetingId || uploading}
                    title="Upload material"
                  >
                    <Icon slug="upload" />
                    <span>{uploading ? "Uploading…" : "Upload"}</span>
                  </button>
                )}

                <button
                  className={`mtl-btn ${showHistory ? "active" : ""}`}
                  onClick={() => setShowHistory((s) => !s)}
                  title="Riwayat materials"
                >
                  <Icon iconUrl="/img/history.png" size={18} />
                  <span>{showHistory ? "Tutup Riwayat" : "Riwayat"}</span>
                </button>

                <button
                  className="mtl-btn ghost"
                  onClick={loadMaterials}
                  title="Refresh"
                >
                  <Icon iconUrl="/img/refresh.png" size={18} />
                  <span>Refresh</span>
                </button>

                {isHost && (
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    style={{ display: "none" }}
                    onChange={onFilesSelected}
                  />
                )}
              </div>
            </div>

            {/* Current materials */}
            {loadingItems && <SkeletonGrid />}
            {errItems && !loadingItems && (
              <div className="pd-error">Gagal memuat materials: {errItems}</div>
            )}
            {!loadingItems && !errItems && items.length === 0 && (
              <div className="pd-empty">Belum ada materials.</div>
            )}
            {!loadingItems && !errItems && items.length > 0 && (
              <div className="mtl-grid">
                {items.map((it) => (
                  <MaterialCard
                    key={it.id}
                    name={it.name}
                    meta={formatMeta(it)}
                    ext={extKind(it.name)}
                    onPreview={() => handlePreview(it)}
                    onDownload={() => handleDownload(it)}
                    onDelete={isHost ? () => handleDelete(it) : null}
                    canDelete={isHost}
                  />
                ))}
              </div>
            )}

            {/* History */}
            {showHistory && (
              <>
                <div className="mtl-divider" />
                <section className="mtl-history">
                  <h3 className="mtl-history-title">
                    <Icon slug="history" /> Riwayat Materials
                    <span className="mtl-chip ghost">
                      {historyGroups.length} meeting
                    </span>
                  </h3>

                  {loadingHistory && <SkeletonAccordion />}
                  {errHistory && !loadingHistory && (
                    <div className="pd-error">
                      Gagal memuat riwayat: {errHistory}
                    </div>
                  )}
                  {!loadingHistory &&
                    !errHistory &&
                    historyGroups.length === 0 && (
                      <div className="pd-empty">
                        Belum ada riwayat materials.
                      </div>
                    )}

                  {!loadingHistory &&
                    !errHistory &&
                    historyGroups.length > 0 && (
                      <div className="mtl-accordion">
                        {historyGroups.map((group) => (
                          <HistoryGroup
                            key={group.meetingId}
                            group={group}
                            onPreview={(it) => handlePreview(it)}
                            onDownload={(it) => handleDownload(it)}
                          />
                        ))}
                      </div>
                    )}
                </section>
              </>
            )}

            {/* err menus */}
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
            active="materials"
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

/* ============ History & Card components ============ */
function HistoryGroup({ group, onPreview, onDownload }) {
  const [open, setOpen] = useState(false);
  const { meetingId, title, startTime, endTime, status, materials } = group;

  return (
    <div className={`mtl-acc ${open ? "open" : ""}`}>
      <button className="mtl-acc-head" onClick={() => setOpen((o) => !o)}>
        <div className="mtl-acc-info">
          <div className="mtl-acc-title">
            {title || `Meeting #${meetingId}`}
            {status && <span className={`mtl-chip ${status}`}>{status}</span>}
          </div>
          <div className="mtl-acc-meta">
            {formatDateRange(startTime, endTime)}
          </div>
        </div>
        <div className="mtl-acc-count">
          <Icon slug="file" />
          {materials?.length || 0}
        </div>
      </button>

      {open && (
        <div className="mtl-acc-body">
          {(!materials || materials.length === 0) && (
            <div className="pd-empty">Tidak ada materials.</div>
          )}
          {materials && materials.length > 0 && (
            <div className="mtl-grid">
              {materials.map((it) => (
                <MaterialCard
                  key={it.id}
                  name={it.name}
                  meta={formatMeta(it)}
                  ext={extKind(it.name)}
                  onPreview={() => onPreview(it)}
                  onDownload={() => onDownload(it)}
                  canDelete={false}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MaterialCard({
  name,
  meta,
  ext,
  onPreview,
  onDownload,
  onDelete,
  canDelete,
}) {
  return (
    <div className="mtl-card">
      <div className={`mtl-fileicon ${ext}`}>
        <div className="mtl-fileext">{extLabel(ext)}</div>
        <Icon slug="file" />
      </div>
      <div className="mtl-info">
        <div className="mtl-name" title={name}>
          {name}
        </div>
        <div className="mtl-meta">{meta}</div>
      </div>
      <div className="mtl-actions-right">
        <button className="mtl-act" title="Lihat" onClick={onPreview}>
          <Icon slug="eye" />
        </button>
        <button className="mtl-act" title="Unduh" onClick={onDownload}>
          <Icon slug="download" />
        </button>
        {canDelete && onDelete && (
          <button className="mtl-act danger" title="Hapus" onClick={onDelete}>
            <Icon slug="trash" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ============ Skeletons ============ */
function SkeletonGrid() {
  return (
    <div className="mtl-grid">
      {Array.from({ length: 4 }).map((_, i) => (
        <div className="mtl-card sk" key={i}>
          <div className="mtl-fileicon sk" />
          <div className="mtl-info">
            <div className="sk-line w-70" />
            <div className="sk-line w-40" />
          </div>
          <div className="mtl-actions-right">
            <div className="mtl-act sk" />
            <div className="mtl-act sk" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonAccordion() {
  return (
    <div className="mtl-accordion">
      {Array.from({ length: 3 }).map((_, i) => (
        <div className="mtl-acc sk" key={i}>
          <div className="mtl-acc-head">
            <div className="mtl-acc-info">
              <div className="sk-line w-50" />
              <div className="sk-line w-30" />
            </div>
            <div className="mtl-acc-count sk" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============ utils ============ */
function guessName(p = "") {
  try {
    const s = p.split("?")[0];
    return s.split("/").pop() || "file";
  } catch {
    return "file";
  }
}

function formatMeta(it) {
  return it.createdAt ? new Date(it.createdAt).toLocaleString() : "—";
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

/* file kind helpers (untuk style ikon/label) */
function extKind(name = "") {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "img";
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx", "rtf"].includes(ext)) return "doc";
  if (["xls", "xlsx", "csv"].includes(ext)) return "xls";
  if (["ppt", "pptx", "key"].includes(ext)) return "ppt";
  if (["zip", "rar", "7z"].includes(ext)) return "zip";
  if (["txt", "md"].includes(ext)) return "txt";
  return "oth";
}
function extLabel(kind) {
  const map = {
    img: "IMG",
    pdf: "PDF",
    doc: "DOC",
    xls: "XLS",
    ppt: "PPT",
    zip: "ZIP",
    txt: "TXT",
    oth: "FILE",
  };
  return map[kind] || "FILE";
}
