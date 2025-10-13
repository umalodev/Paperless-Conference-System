import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { CONTROL_URL } from "../config";

export function useControlSocket() {
  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [mirrorFrames, setMirrorFrames] = useState({});

  useEffect(() => {
    // ✅ Gunakan socket global supaya tidak buat koneksi baru tiap render
    if (window._controlSocket && window._controlSocket.connected) {
      console.log("♻️ Reusing existing Control Server socket");
      setSocket(window._controlSocket);
      return;
    }

    if (window._controlSocket && !window._controlSocket.connected) {
      console.log("♻️ Reconnecting existing Control Server socket");
      window._controlSocket.connect();
      setSocket(window._controlSocket);
      return;
    }

    console.log("🔌 Creating new Control Server socket...");
    const s = io(CONTROL_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    // Simpan global
    window._controlSocket = s;
    setSocket(s);

    // --- Connection events ---
    s.on("connect", () => {
      console.log("🟢 Connected to Control Server:", s.id);
      s.emit("get-participants"); // minta daftar device
    });

    s.on("disconnect", (reason) => {
      console.log("🔴 Disconnected from Control Server:", reason);
    });

    // --- Reconnect success ---
    s.io.on("reconnect_success", () => {
      console.log("🔁 Reconnected — requesting participant list...");
      s.emit("get-participants");
    });

    // --- Participant updates ---
    s.on("participants", (data) => {
      console.log("👥 Participants update:", data);
      setParticipants(data || []);
    });

    // --- Mirror frames ---
    s.on("mirror-frame", ({ from, frame }) =>
      setMirrorFrames((prev) => ({ ...prev, [from]: frame }))
    );

    s.on("mirror-stop", ({ from }) =>
      setMirrorFrames((prev) => {
        const copy = { ...prev };
        delete copy[from];
        return copy;
      })
    );

    // ✅ Cleanup hanya jika bukan HMR reload
    return () => {
      if (!import.meta.hot) s.disconnect();
    };
  }, []);

  return { socket, participants, mirrorFrames, setParticipants, setMirrorFrames };
}
