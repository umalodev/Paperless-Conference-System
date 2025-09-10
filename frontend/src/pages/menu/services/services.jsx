import React, { useEffect, useMemo, useState } from "react";
import BottomNav from "../../../components/BottomNav";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../../config";
import MeetingLayout from "../../../components/MeetingLayout.jsx";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import Icon from "../../../components/Icon.jsx";
import "./services.css";

export default function Services() {
  const [user, setUser] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");
  const navigate = useNavigate();

  // Services UI state
  const [selectedService, setSelectedService] = useState(null); // { key, label, icon }
  const [seat, setSeat] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [note, setNote] = useState("");
  const [recent, setRecent] = useState(() => {
    try {
      const raw = localStorage.getItem("pconf.services.recent");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    // Load basic user info for top bar consistency
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}

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

  const visibleMenus = useMemo(
    () =>
      (menus || [])
        .filter((m) => (m?.flag ?? "Y") === "Y")
        .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999)),
    [menus]
  );
  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  const quickOptions = [
    { key: "staff_assist", label: "Staff Assist", icon: "🧑‍💼" },
    { key: "mineral", label: "Mineral/Tea", icon: "🥤" },
    { key: "coffee", label: "Coffee", icon: "☕" },
    { key: "clean", label: "Clean Up", icon: "🧹" },
  ];

  const onQuickSelect = (opt) => {
    setSelectedService(opt);
  };

  const canSend = !!selectedService && seat.trim().length > 0;

  const onSend = () => {
    if (!canSend) return;
    const item = {
      id: Date.now(),
      serviceKey: selectedService.key,
      serviceLabel: selectedService.label,
      icon: selectedService.icon,
      seat: seat.trim(),
      priority,
      note: note.trim() || null,
      time: new Date().toISOString(),
    };
    setRecent((prev) => {
      const next = [item, ...prev].slice(0, 6);
      localStorage.setItem("pconf.services.recent", JSON.stringify(next));
      return next;
    });
    setSeat("");
    setNote("");
  };

  return (
    <MeetingLayout meetingId={null} userId={null} userRole={"participant"}>
      <div className="pd-app">
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <div>
              <h1 className="pd-title">Services</h1>
              <div className="pd-sub">
                Request assistance during the session
              </div>
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

        <main className="pd-main">
          <div className="svc-grid">
            {/* Recent requests (left) */}
            <section className="svc-card svc-recent">
              <div className="svc-card-title">Recent request</div>
              {(recent || []).length === 0 && (
                <div className="pd-empty" style={{ padding: 12 }}>
                  No recent request
                </div>
              )}
              {(recent || []).map((r) => (
                <button
                  key={r.id}
                  className="svc-recent-item"
                  title={r.note || undefined}
                >
                  <span className="svc-recent-icon" aria-hidden>
                    {r.icon}
                  </span>
                  <span className="svc-recent-text">
                    <strong>{r.serviceLabel}</strong>
                    <span>
                      {r.seat} — {r.priority}
                    </span>
                  </span>
                </button>
              ))}
            </section>

            {/* Main services (right) */}
            <section className="svc-card svc-main">
              <div className="svc-card-title">Quick services</div>
              <div className="svc-quick">
                {quickOptions.map((q) => (
                  <button
                    key={q.key}
                    className={`svc-quick-btn ${
                      selectedService?.key === q.key ? "is-active" : ""
                    }`}
                    onClick={() => onQuickSelect(q)}
                    title={q.label}
                  >
                    <span className="svc-quick-icon">{q.icon}</span>
                    <span className="svc-quick-label">{q.label}</span>
                  </button>
                ))}
              </div>

              <div className="svc-form">
                <div className="svc-form-title">Request</div>
                <div className="svc-form-field">
                  <label>Service</label>
                  <input
                    className="svc-input"
                    placeholder="Select service from quick menu"
                    readOnly
                    value={selectedService ? selectedService.label : ""}
                  />
                </div>
                <div className="svc-form-row">
                  <div className="svc-form-field flex-1">
                    <label>Location / Seat (required)</label>
                    <input
                      className="svc-input"
                      placeholder="Seat 12"
                      value={seat}
                      onChange={(e) => setSeat(e.target.value)}
                      disabled={!selectedService}
                    />
                  </div>
                  <div className="svc-form-field svc-priority">
                    <label>Priority</label>
                    <select
                      className="svc-input"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      disabled={!selectedService}
                    >
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
                <div className="svc-form-field">
                  <label>Note</label>
                  <textarea
                    className="svc-textarea"
                    rows={2}
                    placeholder="Additional note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={!selectedService}
                  />
                </div>
                <div className="svc-form-actions">
                  <button
                    className="svc-send"
                    disabled={!canSend}
                    onClick={onSend}
                    title={canSend ? "Send" : "Select service and seat first"}
                  >
                    Send
                  </button>
                </div>
              </div>
            </section>

            <button
              className="svc-fab"
              title="Open grid"
              aria-label="Open grid"
            >
              ◻︎◻︎
            </button>
          </div>
        </main>

        {!loadingMenus && !errMenus && (
          <BottomNav
            items={visibleMenus}
            active="services"
            onSelect={handleSelectNav}
          />
        )}

        <MeetingFooter onMenuClick={() => {}} showEndButton={true} />
      </div>
    </MeetingLayout>
  );
}
