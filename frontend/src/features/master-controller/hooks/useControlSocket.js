import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { CONTROL_URL } from "../../../config";

/**
 * useControlSocket
 * Handles socket connection, participant updates, mirror streaming, and device commands.
 * @param {{ notify: Function, confirm: Function }} modal - object from useModal()
 */
export default function useControlSocket({ notify, confirm }) {
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

    // 🧩 Real-time participant updates
    s.on("participants", (data) => {
      if (!cancel) setParticipants(data || []);
    });

    // 🪞 Mirror frame updates (throttled)
    s.on("mirror-frame", ({ from, frame }) => {
      if (cancel) return;
      const now = Date.now();
      const last = lastMirrorUpdate.current[from] || 0;
      if (now - last > 150) {
        lastMirrorUpdate.current[from] = now;
        setMirrorFrames((prev) => ({ ...prev, [from]: frame }));
      }
    });

    // 🛑 Mirror stop event
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
  // 🔹 FETCH PARTICIPANTS MANUALLY
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
        title: "Failed to fetch participants",
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

        // ✅ Success notification
        notify?.({
          variant: "success",
          title:
            action === "shutdown"
              ? "Shutdown command sent"
              : action === "restart"
              ? "Restart command sent"
              : "Command executed successfully",
          message:
            data.message || `Command '${action}' has been sent successfully.`,
        });
      } catch (err) {
        console.error(`❌ Failed to send '${action}':`, err);
        notify?.({
          variant: "error",
          title: "Command failed",
          message:
            err.message || "An error occurred while sending the command.",
        });
      }
    },
    [notify]
  );

  // ======================================================
  // 🔹 HANDLE COMMAND BUTTON (WITH MODAL CONFIRMATION)
  // ======================================================
  const sendCommand = useCallback(
    async (targetId, action) => {
      const confirmNeeded = ["lock", "unlock", "restart", "shutdown"].includes(
        action
      );

      if (confirmNeeded && confirm) {
        const confirmMessage =
          action === "lock"
            ? "Lock this device? The user will not be able to operate the system temporarily."
            : action === "unlock"
            ? "Unlock this device? The user will regain control of the system."
            : action === "restart"
            ? "Are you sure you want to restart this device now?"
            : "Are you sure you want to shut down this device?";

        const ok = await confirm({
          title: "Confirm Action",
          message: confirmMessage,
          okText: "Confirm",
          cancelText: "Cancel",
          destructive: ["restart", "shutdown"].includes(action),
        });

        if (!ok) {
          notify?.({
            variant: "info",
            title: "Action cancelled",
            message: "No changes were made.",
          });
          return;
        }
      }

      // local state updates
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
    [executeCommand, notify, confirm]
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
