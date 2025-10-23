// src/features/menu/participants/layouts/ParticipantsLayout.jsx
import React from "react";
import MeetingLayout from "../../../../components/MeetingLayout.jsx";
import MeetingFooter from "../../../../components/MeetingFooter.jsx";
import MeetingHeader from "../../../../components/MeetingHeader.jsx";
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
        <MeetingHeader displayName={displayName} user={user} />
      
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
