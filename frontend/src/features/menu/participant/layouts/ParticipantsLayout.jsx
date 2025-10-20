// src/features/menu/participants/layouts/ParticipantsLayout.jsx
import React from "react";
import MeetingLayout from "../../../../components/MeetingLayout.jsx";
import MeetingFooter from "../../../../components/MeetingFooter.jsx";
import BottomNav from "../../../../components/BottomNav.jsx";
import Icon from "../../../../components/Icon.jsx";

/**
 * Wrapper layout untuk halaman ParticipantsPage
 * - Mengatur header, clock, avatar user, dan struktur utama
 * - Menyediakan slot children di bagian <main>
 */
export default function ParticipantsLayout({
  meetingId,
  user,
  displayName,
  meetingTitle,
  visibleMenus,
  onSelectNav,
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  loadingMenus,
  errMenus,
  children,
}) {
  return (
    <MeetingLayout
      meetingId={meetingId}
      userId={user?.id}
      userRole={user?.role || "participant"}
      socket={null}
      mediasoupDevice={null}
    >
      <div className="pd-app">
        {/* ===== HEADER ===== */}
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <div>
              <h1 className="pd-title">{meetingTitle || "Meeting Default"}</h1>
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
                {(displayName || "US").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="pd-user-name">{displayName}</div>
                <div className="pd-user-role">
                  {user?.role || "Participant"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ===== MAIN CONTENT ===== */}
        <main className="pd-main">
          <section className="prt-wrap">{children}</section>
        </main>

        {/* ===== BOTTOM NAV ===== */}
        {!loadingMenus && !errMenus && (
          <BottomNav
            items={visibleMenus}
            active="participants"
            onSelect={onSelectNav}
          />
        )}

        {/* ===== FOOTER (mic/cam control) ===== */}
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
