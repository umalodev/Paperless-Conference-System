import React, { createContext, useContext, useEffect, useState } from "react";
import meetingSocketService from "../services/meetingSocketService";
import { API_URL } from "../config";

const MeetingSocketContext = createContext(null);

export function MeetingSocketProvider({ children }) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const meetingRaw = JSON.parse(localStorage.getItem("currentMeeting") || "{}");
    const meetingId = meetingRaw?.id || meetingRaw?.meetingId;
    const displayName =
      localStorage.getItem("pconf.displayName") || user?.username || "User";

    if (!user?.id || !meetingId) return;

    // 🔌 Connect sekali saja di seluruh app
    meetingSocketService.connect(meetingId, user.id, API_URL);

    const onConnect = () => {
      setConnected(true);
      meetingSocketService.send({
        type: "join-room",
        meetingId,
        userId: user.id,
        displayName,
      });
      console.log("✅ Socket connected globally to meeting:", meetingId);
    };

    meetingSocketService.socket?.on("connect", onConnect);

    return () => {
      // ❗ Jangan disconnect di sini, biarkan manual di logout saja
      meetingSocketService.socket?.off("connect", onConnect);
    };
  }, []);

  return (
    <MeetingSocketContext.Provider value={{ connected, socket: meetingSocketService }}>
      {children}
    </MeetingSocketContext.Provider>
  );
}

export const useMeetingSocket = () => useContext(MeetingSocketContext);
