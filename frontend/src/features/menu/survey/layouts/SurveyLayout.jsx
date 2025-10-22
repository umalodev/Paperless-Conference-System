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
      {/* === Global Scroll Wrapper === */}
      <div
        className="pd-app survey-scrollable"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* === Topbar === */}
        <header
          className="pd-topbar"
          style={{
            flexShrink: 0,
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "#fff",
          }}
        >
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

        {/* === Scrollable main === */}
        <main
          className="pd-main scrollable-content"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            scrollBehavior: "smooth",
            height: "100vh",
          }}
        >
          {children}
        </main>

        {/* === Bottom Navigation === */}
        {!loadingMenus && !errMenus && (
          <div
            style={{
              position: "fixed",
              bottom: 70, // sedikit di atas footer control
              left: 0,
              right: 0,
              zIndex: 50,
              pointerEvents: "auto",
            }}
          >
            <BottomNav
              items={visibleMenus}
              active="survey"
              onSelect={onSelectNav}
            />
          </div>
        )}

        {/* === Footer Control === */}
        <div style={{ flexShrink: 0 }}>
          <MeetingFooter
            userRole={user?.role || "participant"}
            micOn={micOn}
            camOn={camOn}
            onToggleMic={onToggleMic}
            onToggleCam={onToggleCam}
          />
        </div>
      </div>
    </MeetingLayout>
  );
}
