// src/pages/menu/files/Files.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../../components/BottomNav.jsx";
import Icon from "../../../components/Icon.jsx";
import { API_URL } from "../../../config.js";
import "./Files.css";
import useMeetingGuard from "../../../hooks/useMeetingGuard.js";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import MeetingLayout from "../../../components/MeetingLayout.jsx";

import {
  listFiles,
  uploadFile,
  deleteFile,
} from "../../../services/filesService.js";
import meetingService from "../../../services/meetingService.js";

const absolutize = (u) => {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  const base = String(API_URL || "").replace(/\/+$/, "");
  const p = `/${String(u).replace(/^\/+/, "")}`;
  return `${base}${p}`;
};

export default function Files() {
  const [user, setUser] = useState(null);

  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");

  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [errFiles, setErrFiles] = useState("");

  const [q, setQ] = useState("");

  // upload UI
  const [pick, setPick] = useState(null);
  const [uploading, setUploading] = useState(false);

  // HISTORY UI
  const [showHistory, setShowHistory] = useState(false);
  const [historyGroups, setHistoryGroups] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errHistory, setErrHistory] = useState("");
  const [qHistory, setQHistory] = useState("");

  const navigate = useNavigate();

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

  // menus
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

  // load files current meeting
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        if (!meetingId) {
          setFiles([]);
          setLoadingFiles(false);
          return;
        }
        setLoadingFiles(true);
        setErrFiles("");
        const data = await listFiles(meetingId);
        if (!cancel) setFiles(data);
      } catch (e) {
        if (!cancel) setErrFiles(String(e.message || e));
      } finally {
        if (!cancel) setLoadingFiles(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [meetingId]);

  // load history
  const fetchHistory = async () => {
    setLoadingHistory(true);
    setErrHistory("");
    try {
      const url = new URL(`${API_URL}/api/files/history`);
      if (meetingId) url.searchParams.set("excludeMeetingId", meetingId);
      url.searchParams.set("withFilesOnly", "0");
      if (qHistory.trim()) url.searchParams.set("q", qHistory.trim());

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
            files: (g.files || []).map((f) => ({
              ...f,
              urlAbs: absolutize(f.url),
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
      setErrHistory(String(e.message || e));
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showHistory) fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistory]);

  const visibleMenus = useMemo(
    () =>
      (menus || [])
        .filter((m) => (m?.flag ?? "Y") === "Y")
        .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999)),
    [menus]
  );

  const filtered = useMemo(() => {
    const term = (q || "").trim().toLowerCase();
    if (!term) return files;
    return files.filter(
      (f) =>
        (f.name || "").toLowerCase().includes(term) ||
        (f.uploaderName || "").toLowerCase().includes(term)
    );
  }, [files, q]);

  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  const doUpload = async (e) => {
    e.preventDefault();
    if (!pick || !meetingId) return;
    try {
      setUploading(true);
      const created = await uploadFile({
        meetingId,
        file: pick,
      });
      setFiles((prev) => [created, ...prev]);
      setPick(null);
      (document.getElementById("file-input") || {}).value = "";
    } catch (e) {
      alert(`Gagal upload: ${e.message || e}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId) => {
    if (!confirm("Hapus file ini?")) return;
    try {
      await deleteFile(fileId);
      // hapus dari current list
      setFiles((prev) => prev.filter((x) => x.fileId !== fileId));
      // juga dari history (kalau ada)
      setHistoryGroups((prev) =>
        prev.map((g) => ({
          ...g,
          files: g.files.filter((f) => f.fileId !== fileId),
        }))
      );
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
              <h1 className="pd-title">Files</h1>
              <div className="pd-sub">Berbagi file selama meeting</div>
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
          <section className="files-wrap">
            <div className="files-header">
              <div className="files-title">
                <img
                  src="/img/Files1.png"
                  alt=""
                  className="files-title-icon"
                />
                <span className="files-title-text">Daftar File</span>
              </div>
              <div className="files-actions">
                <div className="files-search">
                  <input
                    type="text"
                    placeholder="Cari file atau uploader…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                <button
                  className={`files-btn ${showHistory ? "active" : ""}`}
                  onClick={() => setShowHistory((s) => !s)}
                  title="Riwayat file meeting sebelumnya"
                >
                  <Icon iconUrl="/img/history.png" size={18} />
                  <span>{showHistory ? "Tutup Riwayat" : "Riwayat"}</span>
                </button>
                <button
                  className="files-btn ghost"
                  onClick={() => window.location.reload()}
                  title="Refresh"
                >
                  <Icon iconUrl="/img/refresh.png" size={18} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Upload form */}
            <form
              className="file-uploader"
              onSubmit={doUpload}
              style={{ marginBottom: 12 }}
            >
              <input
                id="file-input"
                type="file"
                onChange={(e) => setPick(e.target.files?.[0] || null)}
                style={{ marginRight: 8 }}
              />
              <button
                className="files-btn"
                type="submit"
                disabled={!pick || uploading || !meetingId}
              >
                <Icon slug="upload" size={18} />
                <span>{uploading ? "Mengunggah…" : "Unggah"}</span>
              </button>
            </form>

            {loadingFiles && <div className="pd-empty">Memuat file…</div>}
            {errFiles && !loadingFiles && (
              <div className="pd-error">Gagal memuat file: {errFiles}</div>
            )}

            {!loadingFiles && !errFiles && (
              <>
                {filtered.length === 0 ? (
                  <div className="pd-empty">Belum ada file.</div>
                ) : (
                  <div className="files-grid">
                    {filtered.map((f) => (
                      <FileCard
                        key={f.fileId || f.url}
                        file={f}
                        me={user}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* HISTORY */}
            {showHistory && (
              <>
                <div className="files-divider" />
                <section className="files-history">
                  <div className="files-history-head">
                    <h3 className="files-history-title">
                      <Icon iconUrl="/img/history.png" size={18} /> Riwayat
                      Files
                    </h3>
                    <div className="files-history-actions">
                      <input
                        className="files-history-search"
                        type="text"
                        placeholder="Cari di riwayat…"
                        value={qHistory}
                        onChange={(e) => setQHistory(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && fetchHistory()}
                      />
                      <button className="files-btn" onClick={fetchHistory}>
                        <Icon slug="search" size={16} />
                        <span>Cari</span>
                      </button>
                    </div>
                  </div>

                  {loadingHistory && (
                    <div className="pd-empty">Memuat riwayat…</div>
                  )}
                  {errHistory && !loadingHistory && (
                    <div className="pd-error">
                      Gagal memuat riwayat: {errHistory}
                    </div>
                  )}
                  {!loadingHistory &&
                    !errHistory &&
                    historyGroups.length === 0 && (
                      <div className="pd-empty">Belum ada riwayat files.</div>
                    )}

                  {!loadingHistory &&
                    !errHistory &&
                    historyGroups.length > 0 && (
                      <div className="files-accordion">
                        {historyGroups.map((g) => (
                          <FilesHistoryGroup
                            key={g.meetingId}
                            group={g}
                            me={user}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    )}
                </section>
              </>
            )}
          </section>
        </main>

        {!loadingMenus && !errMenus && (
          <BottomNav
            items={visibleMenus}
            active="files"
            onSelect={handleSelectNav}
          />
        )}

        <MeetingFooter userRole={user?.role || "participant"} />
      </div>
    </MeetingLayout>
  );
}

function FilesHistoryGroup({ group, me, onDelete }) {
  const [open, setOpen] = useState(false);
  const { meetingId, title, startTime, endTime, status, files } = group || {};

  return (
    <div className={`facc ${open ? "open" : ""}`}>
      <button className="facc-head" onClick={() => setOpen((o) => !o)}>
        <div className="facc-info">
          <div className="facc-title">
            {title || `Meeting #${meetingId}`}
            {status && <span className={`fchip ${status}`}>{status}</span>}
          </div>
          <div className="facc-meta">{formatDateRange(startTime, endTime)}</div>
        </div>
        <div className="facc-count">
          <Icon slug="files" size={16} />
          {files?.length || 0}
        </div>
      </button>

      {open && (
        <div className="facc-body">
          {(!files || files.length === 0) && (
            <div className="pd-empty">Tidak ada file.</div>
          )}
          {files && files.length > 0 && (
            <div className="files-grid">
              {files.map((f) => (
                <FileCard key={f.fileId} file={f} me={me} onDelete={onDelete} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FileCard({ file, me, onDelete }) {
  const {
    fileId,
    name = "Untitled",
    url = "#",
    size = 0,
    createdAt,
    uploaderName,
    uploaderId,
    mimeType,
  } = file || {};
  const ext = getExt(name);
  const iconUrl = file.iconUrl || mapExtToIcon(ext);
  const absUrl = absolutize(url);
  const onOpen = () => window.open(absUrl, "_blank");
  const onDownload = () => {
    const a = document.createElement("a");
    a.href = absUrl;
    a.download = name;
    a.rel = "noopener";
    a.click();
  };
  const canDelete =
    me &&
    (Number(me.id) === Number(uploaderId) ||
      ["admin", "host"].includes(me?.role));

  return (
    <div className="fcard">
      <div className="fcard-left">
        <span className="fcard-icon">
          <Icon slug={ext || "file"} iconUrl={iconUrl} size={32} />
        </span>
        <div className="fcard-meta">
          <div className="fcard-name" title={name}>
            {name}
          </div>
          <div className="fcard-sub">
            {uploaderName ? `oleh ${uploaderName}` : "—"}
            {size ? ` · ${formatSize(size)}` : ""}
            {createdAt ? ` · ${formatDate(createdAt)}` : ""}
          </div>
        </div>
      </div>
      <div className="fcard-actions">
        <button className="files-btn icon" onClick={onOpen} title="Buka">
          <OpenIcon />
          <span>Buka</span>
        </button>
        <button className="files-btn icon" onClick={onDownload} title="Unduh">
          <Icon slug="download" size={16} />
          <span>Unduh</span>
        </button>
        {canDelete && (
          <button
            className="files-btn danger icon"
            onClick={() => onDelete(fileId)}
            title="Hapus"
          >
            <Icon slug="trash" size={16} />
            <span>Hapus</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* utils */
function getExt(name = "") {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}
function mapExtToIcon(ext = "") {
  const base = "/img/filetypes";
  const map = {
    pdf: `${base}/pdf.svg`,
    doc: `${base}/doc.svg`,
    docx: `${base}/doc.svg`,
    xls: `${base}/xls.svg`,
    xlsx: `${base}/xls.svg`,
    csv: `${base}/xls.svg`,
    ppt: `${base}/ppt.svg`,
    pptx: `${base}/ppt.svg`,
    jpg: `${base}/image.svg`,
    jpeg: `${base}/image.svg`,
    png: `${base}/image.svg`,
    gif: `${base}/image.svg`,
    webp: `${base}/image.svg`,
    mp4: `${base}/video.svg`,
    mov: `${base}/video.svg`,
    mkv: `${base}/video.svg`,
    zip: `${base}/zip.svg`,
    rar: `${base}/zip.svg`,
    "7z": `${base}/zip.svg`,
    txt: `${base}/txt.svg`,
    md: `${base}/txt.svg`,
  };
  return map[ext] || `${base}/file.svg`;
}
function formatSize(bytes = 0) {
  if (!bytes) return "—";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0,
    v = bytes;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}
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

/* ikon kecil */
function OpenIcon() {
  return (
    <svg
      className="pd-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 3h7v7" />
      <path d="M21 3l-9 9" />
      <path d="M10 7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
    </svg>
  );
}
