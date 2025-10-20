import { useCallback, useEffect, useMemo, useState } from "react";
import { useMediaRoom } from "../../../contexts/MediaRoomContext.jsx";
import simpleScreenShare from "../../../services/simpleScreenShare.js";

export default function useScreenShare() {
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
    } catch {
      return { meetingId: null, userId: null };
    }
  }, []);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  // ===== annotate & screenshare state
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [sharingUser, setSharingUser] = useState(null);
  const [screenShareOn, setScreenShareOn] = useState(false);

  // saat halaman dibuka, cek apakah masih ada sesi share yang aktif
  useEffect(() => {
    if (simpleScreenShare && simpleScreenShare.isSharing) {
      setScreenShareOn(true);
      setSharingUser(simpleScreenShare.userId);
    } else {
      setScreenShareOn(false);
      setSharingUser(null);
    }
  }, []);

  // ===== media controls via context
  const {
    ready: mediaReady,
    micOn,
    camOn,
    startMic,
    stopMic,
    startCam,
    stopCam,
  } = useMediaRoom();

  const onToggleMic = useCallback(() => {
    if (!mediaReady) return;
    micOn ? stopMic() : startMic();
  }, [mediaReady, micOn, startMic, stopMic]);

  const onToggleCam = useCallback(() => {
    if (!mediaReady) return;
    camOn ? stopCam() : startCam();
  }, [mediaReady, camOn, startCam, stopCam]);

  const onToggleAnnotate = useCallback(() => {
    setIsAnnotating((v) => !v);
  }, []);

  // ===== derived
  const userRole = user?.role || "participant";

  return {
    // identity
    user,
    userRole,
    meetingId,
    userId,

    // share & annotate
    isAnnotating,
    setIsAnnotating,
    onToggleAnnotate,
    sharingUser,
    setSharingUser,
    screenShareOn,
    setScreenShareOn,

    // media
    micOn,
    camOn,
    onToggleMic,
    onToggleCam,
  };
}
