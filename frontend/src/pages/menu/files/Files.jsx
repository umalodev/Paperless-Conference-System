// src/pages/menu/files/Files.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../../components/BottomNav.jsx";
import Icon from "../../../components/Icon.jsx";
import { API_URL } from "../../../config.js";
import "./Files.css";

export default function Files() {
  const [user, setUser] = useState(null);

  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");

  // files/materials
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [errFiles, setErrFiles] = useState("");

  // ui state
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  // Fetch menus untuk bottom nav (pakai iconUrl dari DB)
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
              iconUrl: m.iconMenu || null, // path public/ atau CDN dari DB
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

  // Fetch files (ganti endpoint sesuai backend kamu)
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingFiles(true);
        setErrFiles("");
        // TODO: ganti ke endpointmu sendiri (mis: /api/materials atau /api/files)
        // const res = await fetch(`${API_URL}/api/files`, { credentials: "include" });
        // if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // const json = await res.json();
        // const data = Array.isArray(json?.data) ? json.data : [];
        // if (!cancel) setFiles(data);

        // ---- fallback data demo ----
        const demo = [
          {
            id: "f1",
            name: "Panduan Rapat.pdf",
            url: "/files/sample/panduan-rapat.pdf",
            size: 256734, // bytes
            updatedAt: "2025-08-10T14:00:00Z",
          },
          {
            id: "f2",
            name: "Slide Sesi 1.pptx",
            url: "/files/sample/sesi-1.pptx",
            size: 1572864,
            updatedAt: "2025-08-12T09:30:00Z",
          },
          {
            id: "f3",
            name: "Daftar Hadir.xlsx",
            url: "/files/sample/daftar-hadir.xlsx",
            size: 83422,
            updatedAt: "2025-08-11T07:12:00Z",
          },
          {
            id: "f4",
            name: "Poster.jpg",
            url: "/files/sample/poster.jpg",
            size: 312045,
            updatedAt: "2025-08-14T02:20:00Z",
          },
          {
            id: "f5",
            name: "Rekaman.mp4",
            url: "/files/sample/rekaman.mp4",
            size: 6_213_004,
            updatedAt: "2025-08-14T10:00:00Z",
          },
        ];
        if (!cancel) setFiles(demo);
        // ----------------------------
      } catch (e) {
        if (!cancel) setErrFiles(String(e.message || e));
      } finally {
        if (!cancel) setLoadingFiles(false);
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

  const filtered = useMemo(() => {
    const term = (q || "").trim().toLowerCase();
    if (!term) return files;
    return files.filter((f) => (f.name || "").toLowerCase().includes(term));
  }, [files, q]);

  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  return (
    <div className="pd-app">
      {/* Top bar */}
      <header className="pd-topbar">
        <div className="pd-left">
          <span className="pd-live" aria-hidden />
          <div>
            <h1 className="pd-title">Files</h1>
            <div className="pd-sub">Materi & Dokumen</div>
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
              <Icon slug="files" iconUrl="/img/files.svg" size={22} />
              <span>Daftar File</span>
            </div>
            <div className="files-actions">
              <div className="files-search">
                <input
                  type="text"
                  placeholder="Cari file…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <button
                className="files-btn ghost"
                onClick={() => window.location.reload()}
                title="Refresh"
              >
                <RefreshIcon />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {loadingFiles && <div className="pd-empty">Memuat file…</div>}
          {errFiles && !loadingFiles && (
            <div className="pd-error">Gagal memuat file: {errFiles}</div>
          )}

          {!loadingFiles && !errFiles && (
            <>
              {filtered.length === 0 ? (
                <div className="pd-empty">Tidak ada file.</div>
              ) : (
                <div className="files-grid">
                  {filtered.map((f) => (
                    <FileCard key={f.id || f.url} file={f} />
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
    </div>
  );
}

function FileCard({ file }) {
  const { name = "Untitled", url = "#", size = 0, updatedAt } = file || {};
  const ext = getExt(name);
  const iconUrl = file.iconUrl || mapExtToIcon(ext); // boleh override dari API

  const onOpen = () => window.open(url, "_blank");
  const onDownload = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    a.click();
  };

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
            {formatSize(size)}
            {updatedAt ? ` · ${formatDate(updatedAt)}` : ""}
          </div>
        </div>
      </div>
      <div className="fcard-actions">
        <button className="files-btn" onClick={onOpen} title="Buka">
          <OpenIcon />
          <span>Buka</span>
        </button>
        <button className="files-btn" onClick={onDownload} title="Unduh">
          <DownloadIcon />
          <span>Unduh</span>
        </button>
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
  // siapkan ikon-ikon filetype di public/img/filetypes/
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
function DownloadIcon() {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
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
      aria-hidden
    >
      <path d="M21 12A9 9 0 1 1 6.7 4.3" />
      <path d="M21 3v9h-9" />
    </svg>
  );
}
