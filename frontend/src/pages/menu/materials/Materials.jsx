import React, { useEffect, useMemo, useState } from "react";
import BottomNav from "../../../components/BottomNav.jsx";
import "./materials.css";
import { API_URL } from "../../../config.js";
import { useNavigate } from "react-router-dom";

export default function Materials() {
  const [user, setUser] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  // Ambil menu dari API (sama seperti dashboard)
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
              iconUrl: m.iconMenu || null,
              flag: m.flag ?? "Y",
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

  return (
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
              {getIcon("materials")} <span>Materials</span>
            </div>
            <div className="mtl-actions">
              <button className="mtl-btn">
                {getIcon("upload")} <span>Upload</span>
              </button>
              <button className="mtl-btn ghost">
                {getIcon("filter")} <span>Filter</span>
              </button>
            </div>
          </div>

          {/* daftar file contoh (static dummy, ganti dengan data API bila sudah ada) */}
          <div className="mtl-grid">
            <MaterialCard name="Agenda.pdf" meta="PDF • 1.2 MB" />
            <MaterialCard name="Presentation.pptx" meta="PPTX • 8.5 MB" />
            <MaterialCard name="Budget.xlsx" meta="XLSX • 410 KB" />
            <MaterialCard name="Minutes.docx" meta="DOCX • 320 KB" />
          </div>

          {/* kosong / error state */}
          {err && (
            <div className="pd-error" style={{ marginTop: 12 }}>
              Gagal memuat menu: {err}
            </div>
          )}
        </section>
      </main>

      {/* Bottom nav dari DB */}
      {!loading && !err && (
        <BottomNav
          items={visibleMenus}
          active="materials"
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}

function MaterialCard({ name, meta }) {
  return (
    <div className="mtl-card">
      <div className="mtl-fileicon">{getIcon("file")}</div>
      <div className="mtl-info">
        <div className="mtl-name">{name}</div>
        <div className="mtl-meta">{meta}</div>
      </div>
      <div className="mtl-actions-right">
        <button className="mtl-act" title="Preview">
          {getIcon("eye")}
        </button>
        <button className="mtl-act" title="Download">
          {getIcon("download")}
        </button>
        <button className="mtl-act" title="More">
          {getIcon("dots")}
        </button>
      </div>
    </div>
  );
}

/* gunakan ikon util yang sama gayanya */
function getIcon(slug = "") {
  const props = {
    className: "pd-svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  switch (slug.toLowerCase()) {
    case "materials":
    case "files":
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      );
    case "file":
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8l6-6V4a2 2 0 0 0-2-2z" />
          <path d="M14 2v6h6" />
        </svg>
      );
    case "eye":
      return (
        <svg {...props}>
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "download":
      return (
        <svg {...props}>
          <path d="M12 3v12" />
          <path d="M7 10l5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
      );
    case "upload":
      return (
        <svg {...props}>
          <path d="M12 21V9" />
          <path d="M7 14l5-5 5 5" />
          <path d="M5 3h14" />
        </svg>
      );
    case "filter":
      return (
        <svg {...props}>
          <path d="M22 3H2l8 9v7l4 2v-9z" />
        </svg>
      );
    case "dots":
      return (
        <svg {...props}>
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <rect x="4" y="4" width="16" height="16" rx="4" />
        </svg>
      );
  }
}
