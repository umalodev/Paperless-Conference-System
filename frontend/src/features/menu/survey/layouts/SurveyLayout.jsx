// src/features/survey/layouts/SurveyLayout.jsx
import React from "react";
import MeetingLayout from "../../../../components/MeetingLayout.jsx";
import MeetingFooter from "../../../../components/MeetingFooter.jsx";
import BottomNav from "../../../../components/BottomNav.jsx";

/**
 * SurveyLayout — wrapper untuk seluruh halaman Survey.
 * Menyediakan topbar, main content, bottom navigation, dan footer.
 */
export default function SurveyLayout({
  meetingId,
  user,
  displayName,
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
  const meetingTitle = React.useMemo(() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.title || `Meeting #${meetingId}`;
    } catch {
      return `Meeting #${meetingId}`;
    }
  }, [meetingId]);

  return (
    <MeetingLayout
      meetingId={meetingId}
      userId={user?.id}
      userRole={user?.role || "participant"}
      socket={null}
      mediasoupDevice={null}
      meetingTitle={meetingTitle}
    >
      <div className="pd-app">
        {/* === Topbar === */}
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <div>
              <h1 className="pd-title">{meetingTitle}</h1>
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
                {displayName?.slice(0, 2)?.toUpperCase() || "U"}
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

        {/* === Main Content === */}
        <main className="pd-main">{children}</main>

        {/* === Bottom Navigation === */}
        {!loadingMenus && !errMenus && (
          <BottomNav
            items={visibleMenus}
            active="survey"
            onSelect={onSelectNav}
          />
        )}

        {/* === Footer Control === */}
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
