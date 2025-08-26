// src/pages/menu/participants.jsx
import React, { useEffect, useMemo, useState } from "react";
import BottomNav from "../../../components/BottomNav.jsx";
import "../participant/participant.css";
import { API_URL } from "../../../config.js";
import { useNavigate } from "react-router-dom";

export default function ParticipantsPage() {
  const [user, setUser] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");

  const [query, setQuery] = useState("");
  const [participants, setParticipants] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [errList, setErrList] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  // Ambil menu bottom-nav dari API (sama dengan dashboard)
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
              iconUrl: m.iconMenu || null,
              flag: m.flag ?? "Y",
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

  // TODO: ganti ke API real daftar peserta kalau endpoint sudah ada.
  // Untuk sekarang, dummy data agar layout terlihat.
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingList(true);
        setErrList("");
        // Contoh: panggil API kamu di sini, mis: `${API_URL}/api/meeting/participants`
        // const res = await fetch(`${API_URL}/api/meeting/participants?...`)
        // const json = await res.json();
        const dummy = [
          {
            id: 1,
            name: "David Li",
            role: "Host",
            seat: "A-01",
            mic: true,
            cam: true,
            hand: false,
          },
          {
            id: 2,
            name: "Ayu Lestari",
            role: "Participant",
            seat: "B-14",
            mic: false,
            cam: true,
            hand: true,
          },
          {
            id: 3,
            name: "Hendra Simatupang",
            role: "Participant",
            seat: "B-08",
            mic: true,
            cam: false,
            hand: false,
          },
          {
            id: 4,
            name: "Nadia Putri",
            role: "Participant",
            seat: "C-02",
            mic: false,
            cam: false,
            hand: false,
          },
          {
            id: 5,
            name: "Rahmat",
            role: "Participant",
            seat: "C-03",
            mic: true,
            cam: true,
            hand: false,
          },
        ];
        if (!cancel) setParticipants(dummy);
      } catch (e) {
        if (!cancel) setErrList(String(e.message || e));
      } finally {
        if (!cancel) setLoadingList(false);
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        (p.seat || "").toLowerCase().includes(q)
    );
  }, [participants, query]);

  const totals = useMemo(() => {
    const total = participants.length;
    const micOn = participants.filter((p) => p.mic).length;
    const camOn = participants.filter((p) => p.cam).length;
    const hands = participants.filter((p) => p.hand).length;
    return { total, micOn, camOn, hands };
  }, [participants]);

  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  return (
    <div className="pd-app">
      {/* Top bar */}
      <header className="pd-topbar">
        <div className="pd-left">
          <span className="pd-live" aria-hidden />
          <div>
            <h1 className="pd-title">Participants</h1>
            <div className="pd-sub">Manage attendees & seats</div>
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
        <section className="prt-wrap">
          <div className="prt-header">
            <div className="prt-search">
              <span className="prt-search-icon">{getIcon("search")}</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, role, or seat…"
                aria-label="Search participants"
              />
            </div>
            <div className="prt-actions">
              <button className="prt-btn" title="Invite">
                {getIcon("invite")}
                <span>Invite</span>
              </button>
              <button className="prt-btn ghost" title="Sort">
                {getIcon("sort")}
                <span>Sort</span>
              </button>
            </div>
          </div>

          <div className="prt-summary">
            <div className="prt-card">
              <div className="prt-card-icon">{getIcon("users")}</div>
              <div>
                <div className="prt-card-title">{totals.total}</div>
                <div className="prt-card-sub">Total</div>
              </div>
            </div>
            <div className="prt-card">
              <div className="prt-card-icon">{getIcon("mic")}</div>
              <div>
                <div className="prt-card-title">{totals.micOn}</div>
                <div className="prt-card-sub">Mic On</div>
              </div>
            </div>
            <div className="prt-card">
              <div className="prt-card-icon">{getIcon("camera")}</div>
              <div>
                <div className="prt-card-title">{totals.camOn}</div>
                <div className="prt-card-sub">Cam On</div>
              </div>
            </div>
            <div className="prt-card">
              <div className="prt-card-icon">{getIcon("hand")}</div>
              <div>
                <div className="prt-card-title">{totals.hands}</div>
                <div className="prt-card-sub">Raised</div>
              </div>
            </div>
          </div>

          {/* List peserta */}
          {loadingList && <div className="pd-empty">Loading participants…</div>}
          {errList && !loadingList && (
            <div className="pd-error">Gagal memuat peserta: {errList}</div>
          )}

          {!loadingList && !errList && (
            <div className="prt-grid">
              {filtered.map((p) => (
                <div key={p.id} className="prt-item">
                  <div className="prt-avatar">
                    {(p.name || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="prt-info">
                    <div className="prt-name">{p.name}</div>
                    <div className="prt-meta">
                      <span className="prt-role">{p.role}</span>
                      {p.seat && <span className="prt-sep">•</span>}
                      {p.seat && (
                        <span className="prt-seat">Seat {p.seat}</span>
                      )}
                    </div>
                  </div>
                  <div className="prt-status">
                    <span
                      className={`prt-pill ${p.mic ? "on" : "off"}`}
                      title={p.mic ? "Mic On" : "Mic Off"}
                    >
                      {getIcon("mic")}
                    </span>
                    <span
                      className={`prt-pill ${p.cam ? "on" : "off"}`}
                      title={p.cam ? "Camera On" : "Camera Off"}
                    >
                      {getIcon("camera")}
                    </span>
                    {p.hand && (
                      <span className="prt-pill on" title="Hand raised">
                        {getIcon("hand")}
                      </span>
                    )}
                  </div>
                  <div className="prt-actions-right">
                    <button className="prt-act" title="Pin">
                      {getIcon("pin")}
                    </button>
                    <button className="prt-act" title="More">
                      {getIcon("dots")}
                    </button>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="pd-empty" style={{ gridColumn: "1 / -1" }}>
                  Tidak ada peserta yang cocok dengan pencarian.
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Bottom nav dari DB */}
      {!loadingMenus && !errMenus && (
        <BottomNav
          items={visibleMenus}
          active="participants"
          onSelect={handleSelectNav}
        />
      )}
    </div>
  );
}

/* Ikon util lokal — sebaiknya dipindah ke utils/icons.js agar DRY */
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
  switch ((slug || "").toLowerCase()) {
    // umum / dari kode lama
    case "materials":
    case "files":
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      );
    case "chat":
      return (
        <svg {...props}>
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
      );
    case "annotate":
    case "whiteboard":
      return (
        <svg {...props}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
      );
    case "agenda":
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "survey":
    case "evaluation":
      return (
        <svg {...props}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5l-4 3V6a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case "camera":
      return (
        <svg {...props}>
          <rect x="3" y="6" width="13" height="12" rx="3" />
          <path d="M16 10l5-3v10l-5-3z" />
        </svg>
      );
    case "service":
      return (
        <svg {...props}>
          <path d="M10.325 4.317a4.5 4.5 0 1 1 6.364 6.364L7 20H3v-4z" />
        </svg>
      );
    case "documents":
      return (
        <svg {...props}>
          <rect x="4" y="2" width="8" height="14" rx="2" />
          <rect x="12" y="8" width="8" height="14" rx="2" />
        </svg>
      );
    case "mic":
      return (
        <svg {...props}>
          <rect x="9" y="2" width="6" height="11" rx="3" />
          <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
          <path d="M12 19v3" />
        </svg>
      );
    case "search":
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      );
    case "users":
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "hand":
      return (
        <svg {...props}>
          <path d="M8 13V7a2 2 0 0 1 4 0v6" />
          <path d="M12 13V6a2 2 0 1 1 4 0v7" />
          <path d="M16 13V8a2 2 0 1 1 4 0v5" />
          <path d="M6 13v-1a2 2 0 1 1 4 0v1" />
          <path d="M5 22h10a4 4 0 0 0 4-4v-5" />
        </svg>
      );
    case "pin":
      return (
        <svg {...props}>
          <path d="M16 2l6 6-8 8-4 2 2-4 8-8z" />
          <path d="M2 22l10-10" />
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
    case "invite":
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6" />
          <path d="M16 11h6" />
        </svg>
      );
    case "sort":
      return (
        <svg {...props}>
          <path d="M3 6h14" />
          <path d="M3 12h10" />
          <path d="M3 18h6" />
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
    case "file":
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8l6-6V4a2 2 0 0 0-2-2z" />
          <path d="M14 2v6h6" />
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
