// src/hooks/useMeetingGuard.js
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import meetingService from "../services/meetingService";

function getCurrentMeetingId() {
  try {
    const raw = localStorage.getItem("currentMeeting");
    const cm = raw ? JSON.parse(raw) : null;
    return cm?.meetingId || cm?.id || cm?.code || null;
  } catch {
    return null;
  }
}

export default function useMeetingGuard({
  meetingId: givenMeetingId = null,
  pollingMs = 5000,
  showAlert = true,
} = {}) {
  const navigate = useNavigate();
  const alertedRef = useRef(false); // cegah alert berulang

  useEffect(() => {
    const meetingId = givenMeetingId || getCurrentMeetingId();
    if (!meetingId) return;

    let cancelled = false;
    let intervalId = null;

    const exitMeeting = (msg) => {
      if (cancelled) return;
      // bersihkan state local
      localStorage.removeItem("currentMeeting");
      // alert sekali saja
      if (showAlert && !alertedRef.current) {
        alertedRef.current = true;
        window.alert(msg || "Meeting telah berakhir.");
      }
      navigate("/start");
    };

    const checkStatusOnce = async () => {
      try {
        const res = await meetingService.getMeetingStatus(meetingId);
        const status = res?.data?.status; // e.g. "waiting" | "started" | "ended"
        const isActive = !!res?.data?.isActive;

        // aturan auto-exit
        if (status === "ended") {
          exitMeeting("Meeting telah berakhir. Anda akan dikeluarkan.");
          return;
        }
        if (!isActive) {
          exitMeeting("Meeting tidak aktif. Anda akan dikeluarkan.");
          return;
        }
      } catch (err) {
        const msg = String(err?.message || err || "");
        // kalau 404 / not found → anggap meeting sudah tidak ada
        if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
          exitMeeting("Meeting tidak ditemukan. Anda akan dikeluarkan.");
          return;
        }
        // error lain → biarkan, coba lagi di tick berikut
        // console.warn("Guard check failed:", msg);
      }
    };

    // cek segera saat mount
    checkStatusOnce();

    // polling periodik
    intervalId = setInterval(checkStatusOnce, pollingMs);

    // cek ulang ketika tab kembali fokus (lebih responsif)
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        checkStatusOnce();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // sengaja tak masukkan navigate ke deps supaya interval tak reset karena re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [givenMeetingId, pollingMs, showAlert]);
}
