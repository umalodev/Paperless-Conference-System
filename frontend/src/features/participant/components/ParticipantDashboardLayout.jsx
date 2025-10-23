// ==========================================================
// 📦 ParticipantDashboardLayout.jsx
// ==========================================================
import React from "react";
import Icon from "../../../components/Icon.jsx";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import MeetingHeader from "../../../components/MeetingHeader.jsx";
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
        <MeetingHeader
          displayName={displayName}
          user={user}
          title={(() => {
            try {
              const raw = localStorage.getItem("currentMeeting");
              const cm = raw ? JSON.parse(raw) : null;
              return cm?.title || `Meeting #${meetingIdDisplay}`;
            } catch {
              return `Meeting #${meetingIdDisplay}`;
            }
          })()}
          meetingId={meetingIdDisplay}
          showId={true}
          showLogout={true}
          onLogout={handleLogout}
        />


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
