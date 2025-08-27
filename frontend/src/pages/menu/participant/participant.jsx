// src/pages/menu/participants.jsx
import React, { useEffect, useMemo, useState } from "react";
import BottomNav from "../../../components/BottomNav.jsx";
import Icon from "../../../components/Icon.jsx";
import "../participant/participant.css";
import { API_URL } from "../../../config.js";
import { useNavigate } from "react-router-dom";
import useMeetingGuard from "../../../hooks/useMeetingGuard.js";

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

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

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
              <span className="prt-search-icon">
                <Icon slug="search" />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, role, or seat…"
                aria-label="Search participants"
              />
            </div>
            <div className="prt-actions">
              <button className="prt-btn" title="Invite">
                <Icon slug="invite" />
                <span>Invite</span>
              </button>
              <button className="prt-btn ghost" title="Sort">
                <Icon slug="sort" />
                <span>Sort</span>
              </button>
            </div>
          </div>

          <div className="prt-summary">
            <div className="prt-card">
              <div className="prt-card-icon">
                <Icon slug="users" />
              </div>
              <div>
                <div className="prt-card-title">{totals.total}</div>
                <div className="prt-card-sub">Total</div>
              </div>
            </div>
            <div className="prt-card">
              <div className="prt-card-icon">
                <Icon slug="mic" />
              </div>
              <div>
                <div className="prt-card-title">{totals.micOn}</div>
                <div className="prt-card-sub">Mic On</div>
              </div>
            </div>
            <div className="prt-card">
              <div className="prt-card-icon">
                <Icon slug="camera" />
              </div>
              <div>
                <div className="prt-card-title">{totals.camOn}</div>
                <div className="prt-card-sub">Cam On</div>
              </div>
            </div>
            <div className="prt-card">
              <div className="prt-card-icon">
                <Icon slug="hand" />
              </div>
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
                      <Icon slug="mic" />
                    </span>
                    <span
                      className={`prt-pill ${p.cam ? "on" : "off"}`}
                      title={p.cam ? "Camera On" : "Camera Off"}
                    >
                      <Icon slug="camera" />
                    </span>
                    {p.hand && (
                      <span className="prt-pill on" title="Hand raised">
                        <Icon slug="hand" />
                      </span>
                    )}
                  </div>
                  <div className="prt-actions-right">
                    <button className="prt-act" title="Pin">
                      <Icon slug="pin" />
                    </button>
                    <button className="prt-act" title="More">
                      <Icon slug="dots" />
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
