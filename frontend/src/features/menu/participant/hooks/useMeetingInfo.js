// src/features/menu/participants/hooks/useMeetingInfo.js
import { useEffect, useMemo, useState } from "react";

export function useMeetingInfo() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");

  const meetingId = useMemo(() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || cm?.code || null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    const dn = localStorage.getItem("pconf.displayName");
    if (dn) setDisplayName(dn);
  }, []);

  return { meetingId, user, displayName };
}
