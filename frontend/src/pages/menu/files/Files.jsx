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
import SimpleScreenShare from "../../../components/SimpleScreenShare.jsx";
import simpleScreenShare from "../../../services/simpleScreenShare.js";
import {
  listFiles,
  uploadFile,
  deleteFile,
} from "../../../services/filesService.js";

const absolutize = (u) => {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u; // sudah absolut
  const base = String(API_URL || "").replace(/\/+$/, "");
  const path = `/${String(u).replace(/^\/+/, "")}`;
  return `${base}${path}`;
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
  const [desc, setDesc] = useState("");
  const [uploading, setUploading] = useState(false);

  // Screen share state - initialize from service if already sharing
  const [screenShareOn, setScreenShareOn] = useState(() => {
    // Check if screen sharing is already active from service
    return simpleScreenShare.isSharing || false;
  });

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
  }, []);

  // Sync screen share state with service on mount
  useEffect(() => {
    if (meetingId && user?.id) {
      // Sync state with service to maintain state across page navigation
      setScreenShareOn(simpleScreenShare.isSharing || false);
    }
  }, [meetingId, user?.id]);

  // Screen share handlers
  const handleToggleScreenShare = async () => {
    if (screenShareOn) {
      simpleScreenShare.stopScreenShare();
      setScreenShareOn(false);
    } else {
      try {
        const success = await simpleScreenShare.startScreenShare();
        if (success) {
          setScreenShareOn(true);
        }
      } catch (error) {
        console.error('Failed to start screen sharing:', error);
      }
    }
  };

  // bottom nav (ikon dari DB)
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingMenus(true);
        setErrMenus("");
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

  // load files dari API
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
        description: desc || "",
      });
      setFiles((prev) => [created, ...prev]);
      setPick(null);
      setDesc("");
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
      setFiles((prev) => prev.filter((x) => x.fileId !== fileId));
    } catch (e) {
      alert(`Gagal menghapus: ${e.message || e}`);
    }
  };

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  return (
    <MeetingLayout
      meetingId={meetingId}
      userId={user?.id}
      userRole={user?.role || 'participant'}
      socket={null} // Will be set when socket is integrated
      mediasoupDevice={null} // MediaSoup will be auto-initialized by simpleScreenShare
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
        {/* Simple Screen Share */}
        <SimpleScreenShare 
          meetingId={meetingId} 
          userId={user?.id}
          isSharing={screenShareOn}
          onSharingChange={setScreenShareOn}
          onError={(error) => console.error('Screen share error:', error)}
        />
        
        <section className="files-wrap">
          <div className="files-header">
            <div className="files-title">
              <Icon slug="files" iconUrl="/img/files.svg" size={22} />
              <span>Daftar File</span>
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
                className="files-btn ghost"
                onClick={() => window.location.reload()}
                title="Refresh"
              >
                <Icon slug="refresh" size={18} />
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
        </section>
      </main>

      {/* Bottom nav dari DB (ikon dari database) */}
      {!loadingMenus && !errMenus && (
        <BottomNav
          items={visibleMenus}
          active="files"
          onSelect={handleSelectNav}
        />
      )}

        <MeetingFooter
          showEndButton={true}
          onMenuClick={() => console.log("open menu")}
          screenShareOn={screenShareOn}
          onToggleScreenShare={handleToggleScreenShare}
        />


      </div>
    </MeetingLayout>
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
        <button className="files-btn" onClick={onOpen} title="Buka">
          <OpenIcon />
          <span>Buka</span>
        </button>
        <button className="files-btn" onClick={onDownload} title="Unduh">
          <Icon slug="download" size={18} />
          <span>Unduh</span>
        </button>
        {canDelete && (
          <button
            className="files-btn danger"
            onClick={() => onDelete(fileId)}
            title="Hapus"
          >
            <Icon slug="trash" size={18} />
            <span>Hapus</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* utils kecil */
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
