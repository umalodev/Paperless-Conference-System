// src/features/chat/layouts/ChatLayout.jsx
import React from "react";
import MeetingLayout from "../../../../components/MeetingLayout.jsx";
import MeetingFooter from "../../../../components/MeetingFooter.jsx";
import BottomNav from "../../../../components/BottomNav.jsx";

/**
 * ChatLayout – layout utama untuk halaman Chat
 *
 * ✅ Membungkus semua elemen UI utama:
 * - Header (judul meeting + user info)
 * - Konten (children chat)
 * - Bottom Navigation (menu)
 * - MeetingFooter (control mic/cam)
 */
export default function ChatLayout({
  meetingId,
  user,
  displayName,
  menus,
  activeSlug,
  onSelectNav,
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  children,
}) {
  const currentMeeting = (() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  })();

  return (
    <MeetingLayout
      meetingId={meetingId}
      userId={user?.id}
      userRole={user?.role || "participant"}
      socket={null}
      mediasoupDevice={null}
    >
      <div className="pd-app">
        {/* ======= 🧭 Top Bar ======= */}
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <div>
              <h1 className="pd-title">
                {currentMeeting.title || "Meeting Default"}
              </h1>
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
                {displayName?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="pd-user-name">
                  {displayName || "Participant"}
                </div>
                <div className="pd-user-role">
                  {user?.role || "Participant"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ======= 💬 Chat Content ======= */}
        <main className="pd-main">
          <section className="chat-wrap">{children}</section>
        </main>

        {/* ======= 🔻 Bottom Navigation ======= */}
        {menus?.length > 0 && (
          <BottomNav items={menus} active={activeSlug} onSelect={onSelectNav} />
        )}

        {/* ======= 🎙️ Meeting Footer ======= */}
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
