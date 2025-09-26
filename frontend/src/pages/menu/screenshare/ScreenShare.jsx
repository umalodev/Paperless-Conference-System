import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import MeetingLayout from "../../../components/MeetingLayout.jsx";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import SimpleScreenShare from "../../../components/SimpleScreenShare.jsx";
import { useMediaRoom } from "../../../contexts/MediaRoomContext.jsx";
export default function ScreenSharePage() {
  const [user, setUser] = useState(null);

  const { meetingId, userId } = useMemo(() => {
    try {
      const rawMeeting = localStorage.getItem("currentMeeting");
      const meeting = rawMeeting ? JSON.parse(rawMeeting) : null;
      const mid = meeting?.meetingId || meeting?.id || meeting?.code || null;

      const rawUser = localStorage.getItem("user");
      const userData = rawUser ? JSON.parse(rawUser) : null;
      const uid = userData?.id || userData?._id || userData?.userId || null;

      return { meetingId: mid, userId: uid };
    } catch (e) {
      return { meetingId: null, userId: null };
    }
  }, []);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  const {
    ready: mediaReady,
    error: mediaError,
    micOn,
    camOn,
    startMic,
    stopMic,
    startCam,
    stopCam,
    muteAllOthers,
  } = useMediaRoom();

  const onToggleMic = useCallback(() => {
    if (!mediaReady) return;
    micOn ? stopMic() : startMic();
  }, [mediaReady, micOn, startMic, stopMic]);

  const onToggleCam = useCallback(() => {
    if (!mediaReady) return;
    camOn ? stopCam() : startCam();
  }, [mediaReady, camOn, startCam, stopCam]);

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
