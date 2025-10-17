// ==========================================================
// 📦 ParticipantDashboardLayout.jsx
// ==========================================================
import React from "react";
import Icon from "../../../components/Icon.jsx";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import MeetingLayout from "../../../components/MeetingLayout.jsx";
import "../../../features/participant/styles/participant-dashboard.css";

export default function ParticipantDashboardLayout({
  meetingIdDisplay,
  activeMeetingId,
  user,
  displayName,
  visibleMenus,
  badgeMap,
  setBadgeLocal,
  loading,
  err,
  handleTileClick,
  handleLogout,
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
}) {
  return (
    <MeetingLayout
      meetingId={activeMeetingId}
      userId={user?.id || user?.userId || null}
      userRole={user?.role || "participant"}
      disableMeetingSocket={true}
      badgeMap={badgeMap}
      setBadgeLocal={setBadgeLocal}
    >
      <div className="pd-app centered-page">
        {/* HEADER */}
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <div>
              <h1 className="pd-title">
                {(() => {
                  try {
                    const raw = localStorage.getItem("currentMeeting");
                    const cm = raw ? JSON.parse(raw) : null;
                    return cm?.title || `Meeting #${meetingIdDisplay}`;
                  } catch {
                    return `Meeting #${meetingIdDisplay}`;
                  }
                })()}
              </h1>
              <div className="pd-sub">ID: {meetingIdDisplay}</div>
            </div>
          </div>
          <div className="pd-right">
            <div className="pd-clock">
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="pd-user">
              <div className="pd-avatar">
                {(displayName || user?.username || "User").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="pd-user-name">{displayName || user?.username || "Participant"}</div>
                <div className="pd-user-role">{user?.role}</div>
              </div>
              <button className="pd-ghost" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* MAIN */}
        <main className="pd-main">
          <section className="pd-panel pd-dock">
            {loading && <div className="pd-empty">Loading menus…</div>}
            {err && !loading && <div className="pd-error">Gagal memuat menu: {err}</div>}
            {!loading && !err && (
              <div className="pd-grid">
                {visibleMenus.map((m) => {
                  const slug = (m.slug || "").toLowerCase();
                  const val = Number(badgeMap[slug] || 0);
                  return (
                    <button
                      key={m.menuId || m.slug}
                      className="pd-tile"
                      onClick={() => handleTileClick(m)}
                      aria-label={val > 0 ? `${m.label}, ${val} baru` : m.label || m.slug}
                    >
                      <span className="pd-tile-icon">
                        <Icon slug={m.slug} iconUrl={m.iconUrl} />
                        {val > 0 ? (
                          <span className="pd-badge">{val > 99 ? "99+" : val}</span>
                        ) : m.hasNew ? (
                          <span className="pd-dot" />
                        ) : null}
                      </span>
                      <span className="pd-tile-label">{m.label}</span>
                    </button>
                  );
                })}
                {visibleMenus.length === 0 && (
                  <div className="pd-empty">Tidak ada menu untuk role ini.</div>
                )}
              </div>
            )}
          </section>
        </main>

        {/* FOOTER */}
        <MeetingFooter
          userRole={user?.role || "participant"}
          micOn={micOn}
          camOn={camOn}
          onToggleMic={onToggleMic}
          onToggleCam={onToggleCam}
          onHelpClick={() => alert("Contact support")}
        />
      </div>
    </MeetingLayout>
  );
}
