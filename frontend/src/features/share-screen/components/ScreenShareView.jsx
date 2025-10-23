import React from "react";
import MeetingLayout from "../../../components/MeetingLayout.jsx";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import SimpleScreenShare from "./SimpleScreenShare.jsx";

export default function ScreenShareView({
  meetingId,
  userRole,
  userId,
  sharingUser,
  setSharingUser,
  screenShareOn,
  setScreenShareOn,
  isAnnotating,
  onToggleAnnotate,
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
}) {
  return (
    <MeetingLayout
      title="Screen Share"
      subtitle="Layar peserta yang sedang berbagi"
      meetingId={meetingId}
      userRole={userRole}
      socket={null}
      mediasoupDevice={null}
    >
      <div className="pd-app">
        <main className="pd-main">
          <SimpleScreenShare
            meetingId={meetingId}
            userId={userId}
            sharingUser={sharingUser}
            setSharingUser={setSharingUser}
            setScreenShareOn={setScreenShareOn}
            isAnnotating={isAnnotating}
            setIsAnnotating={() => {}}
          />
        </main>

        <MeetingFooter
          userRole={userRole}
          micOn={micOn}
          camOn={camOn}
          onToggleMic={onToggleMic}
          onToggleCam={onToggleCam}
          isSharingUser={sharingUser}
          currentUserId={userId}
          screenShareOn={screenShareOn}
          isAnnotating={isAnnotating}
          onToggleAnnotate={onToggleAnnotate}
        />
      </div>
    </MeetingLayout>
  );
}
