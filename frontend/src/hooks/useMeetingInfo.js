// src/hooks/useMeetingInfo.js
import { useState, useEffect, useMemo } from "react";

/**
 * useMeetingInfo — mengelola info user & meeting yang tersimpan di localStorage.
 * Mengembalikan:
 *  - user: data user login (objek)
 *  - displayName: nama tampilan (string)
 *  - meetingId: id/kode meeting aktif
 *  - meetingTitle: judul meeting aktif
 *  - isHost: boolean (host/admin)
 */
export default function useMeetingInfo() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");

  // === Ambil user dan display name dari localStorage ===
  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      if (u) setUser(JSON.parse(u));
    } catch (err) {
      console.warn("⚠️ Gagal parse user dari localStorage:", err);
    }

    const dn = localStorage.getItem("pconf.displayName") || "";
    setDisplayName(dn);
  }, []);

  // === Ambil meeting info dari localStorage ===
  const meetingId = useMemo(() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || cm?.code || null;
    } catch {
      return null;
    }
  }, []);

  const meetingTitle = useMemo(() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.title || (meetingId ? `Meeting #${meetingId}` : "Meeting");
    } catch {
      return "Meeting";
    }
  }, [meetingId]);

  const isHost = /^(host|admin)$/i.test(user?.role || "");

  return {
    user,
    displayName,
    meetingId,
    meetingTitle,
    isHost,
  };
}
