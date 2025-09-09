import React, { useMemo } from "react";
import MeetingLayout from "../../../components/MeetingLayout.jsx";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import SimpleScreenShare from "../../../components/SimpleScreenShare.jsx";

export default function ScreenSharePage() {
  const { meetingId, userId } = useMemo(() => {
    try {
      const rawMeeting = localStorage.getItem("currentMeeting");
      const meeting = rawMeeting ? JSON.parse(rawMeeting) : null;
      const mid = meeting?.meetingId || meeting?.id || meeting?.code || null;

      const rawUser = localStorage.getItem("user");
      const user = rawUser ? JSON.parse(rawUser) : null;
      const uid = user?.id || user?._id || user?.userId || null;

      return { meetingId: mid, userId: uid };
    } catch (e) {
      return { meetingId: null, userId: null };
    }
  }, []);

  return (
    <MeetingLayout
      title="Screen Share"
      subtitle="Layar peserta yang sedang berbagi"
      meetingId={meetingId}
      userRole={"participant"}
      socket={null}
      mediasoupDevice={null}
    >
      <div className="pd-app">
        <main className="pd-main">
          <SimpleScreenShare meetingId={meetingId} userId={userId} />
        </main>
        <MeetingFooter userRole={user?.role || "participant"} />
      </div>
    </MeetingLayout>
  );
}


