// src/features/chat/layouts/ChatLayout.jsx
import React from "react";
import MeetingLayout from "../../../../components/MeetingLayout.jsx";
import MeetingHeader from "../../../../components/MeetingHeader.jsx";
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
        <MeetingHeader displayName={displayName} user={user} />


        {/* ======= 💬 Chat Content ======= */}
        <main className="pd-main">
          <section className="chat-wrap">{children}</section>
        </main>

        {/* ======= 🔻 Bottom Navigation ======= */}
        {menus?.length > 0 && (
          <BottomNav items={menus} active="chating" onSelect={onSelectNav} />
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
