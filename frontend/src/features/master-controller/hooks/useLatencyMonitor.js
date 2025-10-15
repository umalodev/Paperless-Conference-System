import { useEffect, useState } from "react";

/**
 * Hook untuk menghitung latency (ping dari client ke server)
 */
export default function useLatencyMonitor(socket) {
  const [latency, setLatency] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const interval = setInterval(() => {
      const ts = Date.now();
      socket.emit("ping-check", { ts });
    }, 3000);

    socket.on("pong-check", ({ ts }) => {
      const diff = Date.now() - ts;
      setLatency(diff);
    });

    return () => {
      clearInterval(interval);
      socket.off("pong-check");
    };
  }, [socket]);

  return latency;
}
