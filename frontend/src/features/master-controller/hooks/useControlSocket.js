import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { CONTROL_URL } from "../../../config";

export default function useControlSocket(notify) {
  const [user, setUser] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [mirrorFrames, setMirrorFrames] = useState({});
  const [latency, setLatency] = useState(null);

  const socketRef = useRef(null);
  const lastMirrorUpdate = useRef({});
  const reconnectingRef = useRef(false);

  // ======================================================
  // 🔹 INIT SOCKET.IO CONNECTION
  // ======================================================
  useEffect(() => {
    let cancel = false;
    const s = io(CONTROL_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = s;

    s.on("connect", () => {
      console.log("🟢 Connected to Control Server");
      reconnectingRef.current = false;
      fetchParticipants();
    });

    s.on("disconnect", () => {
      console.log("🔴 Disconnected from Control Server");
    });

    // 🧩 Update participants realtime
    s.on("participants", (data) => {
      if (!cancel) setParticipants(data || []);
    });

    // 🪞 Mirror frame (throttled)
    s.on("mirror-frame", ({ from, frame }) => {
      if (cancel) return;
      const now = Date.now();
      const last = lastMirrorUpdate.current[from] || 0;
      if (now - last > 150) { // limit ~6fps
        lastMirrorUpdate.current[from] = now;
        setMirrorFrames((prev) => ({ ...prev, [from]: frame }));
      }
    });

    // 🛑 Mirror stop
    s.on("mirror-stop", ({ from }) => {
      if (!cancel) {
        setMirrorFrames((prev) => {
          const copy = { ...prev };
          delete copy[from];
          return copy;
        });
      }
    });

    // 🕓 Latency monitor
    const latencyInterval = setInterval(() => {
      const ts = Date.now();
      s.emit("ping-check", { ts });
    }, 3000);

    s.on("pong-check", ({ ts }) => {
      setLatency(Date.now() - ts);
    });

    return () => {
      cancel = true;
      clearInterval(latencyInterval);
      s.disconnect();
    };
  }, []);

  // ======================================================
  // 🔹 FETCH PARTICIPANTS MANUAL
  // ======================================================
  const fetchParticipants = useCallback(async () => {
    try {
      const res = await fetch(`${CONTROL_URL}/api/control/participants`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setParticipants(json.participants || []);
    } catch (err) {
      console.error("❌ fetchParticipants error:", err);
      notify?.({
        variant: "error",
        title: "Gagal mengambil data peserta",
        message: err.message,
      });
    }
  }, [notify]);

  // ======================================================
  // 🔹 EXECUTE COMMAND
  // ======================================================
  const executeCommand = useCallback(
    async (targetId, action) => {
      try {
        const res = await fetch(`${CONTROL_URL}/api/control/command/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetId }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        notify?.({
          variant: "success",
          title:
            action === "shutdown"
              ? "Perintah Shutdown dikirim"
              : action === "restart"
              ? "Perintah Restart dikirim"
              : "Perintah Berhasil",
          message: data.message || `Perintah ${action} berhasil dikirim.`,
        });
      } catch (err) {
        console.error(`❌ Failed to send '${action}':`, err);
        notify?.({
          variant: "error",
          title: "Gagal Mengirim Perintah",
          message: err.message || "Terjadi kesalahan saat mengirim command.",
        });
      }
    },
    [notify]
  );

  // ======================================================
  // 🔹 HANDLE COMMAND BUTTON
  // ======================================================
  const sendCommand = useCallback(
    async (targetId, action) => {
      if (action === "mirror-stop") {
        setMirrorFrames((prev) => {
          const copy = { ...prev };
          delete copy[targetId];
          return copy;
        });
      }

      if (action === "lock") {
        setParticipants((prev) =>
          prev.map((p) => (p.id === targetId ? { ...p, isLocked: true } : p))
        );
      }

      if (action === "unlock") {
        setParticipants((prev) =>
          prev.map((p) => (p.id === targetId ? { ...p, isLocked: false } : p))
        );
      }

      await executeCommand(targetId, action);
    },
    [executeCommand]
  );

  // ======================================================
  // 🔹 RETURN ALL STATES
  // ======================================================
  return {
    user,
    participants,
    mirrorFrames,
    latency,
    fetchParticipants,
    sendCommand,
  };
}
