import { useState, useEffect, useRef, useCallback } from "react";
import React from "react";
import { io as socketIO } from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
import { MEDIA_URL } from "../config";

export default function useMediasoupRoom({ roomId, peerId }) {
  const socketRef = useRef(null);
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const audioProducerRef = useRef(null);
  const videoProducerRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const localAudioStreamRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const [remotePeers, setRemotePeers] = useState(new Map());
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);

  const updateRemotePeer = useCallback((pid, updater) => {
    setRemotePeers((prev) => {
      const next = new Map(prev);
      const cur = next.get(pid) || {
        stream: new MediaStream(),
        consumers: new Set(),
        name: "",
        consumersInfo: new Map(),
        audioActive: false,
        videoActive: false,
      };
      const updated = updater(cur);
      next.set(pid, updated);
      return next;
    });
  }, []);

  const removeConsumer = useCallback((peerId, consumerId) => {
    setRemotePeers((prev) => {
      const next = new Map(prev);
      const cur = next.get(peerId);
      if (!cur) return prev;
      cur.consumers.delete(consumerId);
      const track = cur.consumerTracks?.get(consumerId);
      if (track) {
        try {
          cur.stream?.removeTrack(track);
        } catch {}
        cur.consumerTracks.delete(consumerId);
      }

      if (cur.consumersInfo) {
        cur.consumersInfo.delete(consumerId);
        cur.audioActive = [...cur.consumersInfo.values()].some(
          (i) => i.kind === "audio" && i.active
        );
        cur.videoActive = [...cur.consumersInfo.values()].some(
          (i) => i.kind === "video" && i.active
        );
      }

      if (!cur.stream || cur.stream.getTracks().length === 0) {
        cur.stream = new MediaStream();
      }
      next.set(peerId, cur);
      return next;
    });
  }, []);

  const emitAck = useCallback((event, payload, timeoutMs = 8000) => {
    const socket = socketRef.current;
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error("socket not ready"));
      if (socket.timeout) {
        socket.timeout(timeoutMs).emit(event, payload, (err, res) => {
          if (err) return reject(err);
          resolve(res);
        });
      } else {
        const to = setTimeout(
          () => reject(new Error(event + " ack timeout")),
          timeoutMs
        );
        socket.emit(event, payload, (res) => {
          clearTimeout(to);
          resolve(res);
        });
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        if (!roomId || !peerId) return;
        setError("");
        setReady(false);

        const socket = socketIO(MEDIA_URL, {
          timeout: 10000,
          path: "/socket.io",
          withCredentials: false,
        });
        socketRef.current = socket;

        socket.io.on("error", (err) => {
          console.error("[socket.io manager error]", err);
        });
        socket.io.on("reconnect_attempt", (n) => {
          console.warn("[socket.io reconnect_attempt]", n);
        });
        socket.on("connect_error", (err) => {
          console.error("[socket connect_error]", {
            message: err?.message,
            description: err?.description,
            context: err?.context,
          });
        });

        await new Promise((resolve, reject) => {
          const onConnect = () => {
            socket.off("connect_error", onErr);
            resolve();
          };
          const onErr = (err) => {
            socket.off("connect", onConnect);
            reject(err || new Error("Socket connect timeout"));
          };
          socket.once("connect", onConnect);
          socket.once("connect_error", onErr);
        });

        socket.emit("join-room", {
          roomId,
          roomName: `room-${roomId}`,
          peerId,
        });

        const rtpCaps = await new Promise((resolve, reject) => {
          const onCaps = (payload) => {
            resolve(payload?.rtpCapabilities);
            socket.off("router-rtp-capabilities", onCaps);
          };
          socket.on("router-rtp-capabilities", onCaps);
          setTimeout(() => reject(new Error("No rtpCapabilities")), 10000);
        });

        const device = new mediasoupClient.Device();
        await device.load({ routerRtpCapabilities: rtpCaps });
        deviceRef.current = device;

        const sendTransport = await createTransport(socket, {
          direction: "send",
          roomId,
        });
        sendTransportRef.current = sendTransport;

        sendTransport.on("connect", ({ dtlsParameters }, cb, errb) => {
          socket.emit("connect-transport", {
            transportId: sendTransport.id,
            dtlsParameters,
          });
          cb();
        });
        sendTransport.on(
          "produce",
          ({ kind, rtpParameters, appData }, cb, errb) => {
            socket.emit("produce", {
              roomId,
              transportId: sendTransport.id,
              kind,
              rtpParameters,
              appData,
            });
            const onProduced = (payload) => {
              cb({ id: payload.id });
              socket.off("produced", onProduced);
            };
            socket.on("produced", onProduced);
          }
        );

        const recvTransport = await createTransport(socket, {
          direction: "recv",
          roomId,
        });
        recvTransportRef.current = recvTransport;
        recvTransport.on("connect", ({ dtlsParameters }, cb, errb) => {
          socket.emit("connect-transport", {
            transportId: recvTransport.id,
            dtlsParameters,
          });
          cb();
        });

        try {
          const res = await emitAck("get-producers", {
            roomId,
            rtpCapabilities: device.rtpCapabilities,
          });
          if (res?.ok && Array.isArray(res.producers)) {
            for (const item of res.producers) {
              await consumeOne({
                socket,
                device,
                recvTransport,
                producerId: item.producerId,
                ownerPeerId: item.peerId || "unknown",
              });
            }
          } else {
            console.warn("get-producers failed:", res?.error);
          }
        } catch (e) {
          console.warn("get-producers error:", e);
        }

        socket.on(
          "new-producer",
          async ({ producerId, kind, peerId: ownerPeerId }) => {
            try {
              await consumeOne({
                socket,
                device,
                recvTransport,
                producerId,
                ownerPeerId,
              });
            } catch (e) {
              console.error("consume error", e);
            }
          }
        );

        socket.on("peer-left", ({ peerId: leftPeerId }) => {
          setRemotePeers((prev) => {
            const next = new Map(prev);
            next.delete(leftPeerId);
            return next;
          });
        });

        socket.on("muted-by-host", ({ kind }) => {
          if (kind === "audio") {
            const p = audioProducerRef.current;
            try {
              p?.pause();
            } catch {}
            setMicOn(false);
          }
        });

        setReady(true);
      } catch (e) {
        console.error(e);
        setError(e.message || String(e));
      }
    }

    init();

    return () => {
      cancelled = true;
      try {
        audioProducerRef.current?.close();
        videoProducerRef.current?.close();
        sendTransportRef.current?.close();
        recvTransportRef.current?.close();
        socketRef.current?.disconnect();
      } catch {}
      deviceRef.current = null;
      sendTransportRef.current = null;
      recvTransportRef.current = null;
    };
  }, [roomId, peerId]);

  async function createTransport(socket, { direction, roomId }) {
    return new Promise((resolve, reject) => {
      socket.emit("create-transport", { direction, roomId });
      const onCreated = async (payload) => {
        try {
          const device = deviceRef.current;
          const transport =
            direction === "send"
              ? device.createSendTransport(payload)
              : device.createRecvTransport(payload);
          resolve(transport);
        } catch (e) {
          reject(e);
        } finally {
          socket.off("transport-created", onCreated);
        }
      };
      socket.on("transport-created", onCreated);
      setTimeout(() => reject(new Error("create-transport timeout")), 10000);
    });
  }

  async function consumeOne({
    socket,
    device,
    recvTransport,
    producerId,
    ownerPeerId,
  }) {
    return new Promise((resolve, reject) => {
      socket.emit("consume", {
        roomId,
        transportId: recvTransport.id,
        producerId,
        rtpCapabilities: device.rtpCapabilities,
        paused: false,
      });

      const onConsumed = async (payload) => {
        try {
          const consumer = await recvTransport.consume({
            id: payload.id,
            producerId: payload.producerId,
            kind: payload.kind,
            rtpParameters: payload.rtpParameters,
          });

          // ✅ Helper untuk update active flags
          const updateActiveFlags = (isActive) => {
            updateRemotePeer(ownerPeerId, (cur) => {
              const info = cur.consumersInfo.get(consumer.id);
              if (info) info.active = isActive;
              cur.audioActive = [...cur.consumersInfo.values()].some(
                (i) => i.kind === "audio" && i.active
              );
              cur.videoActive = [...cur.consumersInfo.values()].some(
                (i) => i.kind === "video" && i.active
              );
              return { ...cur };
            });
          };

          // ✅ Event listeners untuk sinkronisasi pause/resume
          consumer.on("producerpause", () => {
            console.log(
              `🔇 Producer paused for consumer ${consumer.id} (${consumer.kind})`
            );
            updateActiveFlags(false);
          });

          consumer.on("producerresume", async () => {
            console.log(
              `🔊 Producer resumed for consumer ${consumer.id} (${consumer.kind})`
            );
            try {
              if (consumer.paused) await consumer.resume();
            } catch {}
            updateActiveFlags(true);
          });

          consumer.on("pause", () => {
            console.log(`⏸️ Consumer paused ${consumer.id} (${consumer.kind})`);
            updateActiveFlags(false);
          });

          consumer.on("resume", () => {
            console.log(
              `▶️ Consumer resumed ${consumer.id} (${consumer.kind})`
            );
            updateActiveFlags(true);
          });

          if (consumer.kind === "video") {
            try {
              await consumer.resume();
            } catch {}
            setTimeout(() => {
              try {
                consumer.requestKeyFrame();
              } catch {}
            }, 200);
          } else if (consumer.kind === "audio") {
            try {
              await consumer.resume();
            } catch {}
          }

          const activeNow = !payload.producerPaused && !consumer.paused;

          updateRemotePeer(ownerPeerId, (cur) => {
            const stream = cur.stream || new MediaStream();
            stream.addTrack(consumer.track);
            cur.stream = stream;
            cur.consumers.add(consumer.id);

            if (!cur.consumerTracks) cur.consumerTracks = new Map();
            cur.consumerTracks.set(consumer.id, consumer.track);

            cur.consumersInfo.set(consumer.id, {
              kind: consumer.kind,
              active: activeNow,
            });
            if (consumer.kind === "audio")
              cur.audioActive = activeNow || cur.audioActive;
            if (consumer.kind === "video")
              cur.videoActive = activeNow || cur.videoActive;

            return { ...cur };
          });

          consumer.on("transportclose", () =>
            removeConsumer(ownerPeerId, consumer.id)
          );
          consumer.on("producerclose", () =>
            removeConsumer(ownerPeerId, consumer.id)
          );

          resolve();
        } catch (e) {
          reject(e);
        } finally {
          socket.off("consumed", onConsumed);
        }
      };

      socket.on("consumed", onConsumed);
      setTimeout(() => reject(new Error("consume timeout")), 10000);
    });
  }

  const startMic = useCallback(async () => {
    const transport = sendTransportRef.current;
    if (!transport || transport.closed) {
      setError("send transport not ready");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      const track = stream.getAudioTracks()[0];

      let p = audioProducerRef.current;
      if (p?.closed) p = null;

      if (p) {
        await p.replaceTrack({ track });
        await p.resume();
      } else {
        p = await transport.produce({
          track,
          appData: { type: "mic", peerId },
        });
        audioProducerRef.current = p;

        p.on("trackended", () => stopMic());
        p.on("transportclose", () => {
          if (audioProducerRef.current === p) audioProducerRef.current = null;
          try {
            localAudioStreamRef.current?.getTracks()?.forEach((t) => t.stop());
          } catch {}
          localAudioStreamRef.current = null;
          setMicOn(false);
        });
        p.on("close", () => {
          if (audioProducerRef.current === p) audioProducerRef.current = null;
        });
      }

      try {
        const socket = socketRef.current;
        if (socket && p?.id) {
          socket.emit("resume-producer", { producerId: p.id }, (ack) => {
            if (!ack?.ok) console.warn("resume-producer failed:", ack?.error);
          });
        }
      } catch {}

      try {
        localAudioStreamRef.current?.getTracks()?.forEach((t) => t.stop());
      } catch {}
      localAudioStreamRef.current = stream;
      setMicOn(true);
    } catch (e) {
      console.error("startMic failed", e);
      setError(e?.message || String(e));
      setMicOn(false);
      try {
        localAudioStreamRef.current?.getTracks()?.forEach((t) => t.stop());
      } catch {}
      localAudioStreamRef.current = null;
    }
  }, [peerId]);

  const stopMic = useCallback(async () => {
    const p = audioProducerRef.current;
    if (!p) return;
    try {
      if (!p.closed) await p.pause();
    } catch {}

    try {
      const socket = socketRef.current;
      socket && socket.emit("pause-producer", { producerId: p.id }, () => {});
    } catch {}
    try {
      p.track?.stop();
    } catch {}
    try {
      localAudioStreamRef.current?.getTracks()?.forEach((t) => t.stop());
    } catch {}
    localAudioStreamRef.current = null;
    setMicOn(false);
  }, []);

  // ✅ FIXED: startCam dengan cleanup & resume yang proper
  const startCam = useCallback(async () => {
    const transport = sendTransportRef.current;
    if (!transport || transport.closed) {
      setError("send transport not ready");
      return;
    }

    try {
      console.log("📹 Starting camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { width: 1280, height: 720 },
      });
      const track = stream.getVideoTracks()[0];

      let p = videoProducerRef.current;

      if (p?.closed) {
        console.log("🔄 Producer closed, creating new one");
        p = null;
      }

      if (p) {
        console.log("🔄 Replacing track on existing producer");

        try {
          const oldTrack = p.track;
          if (oldTrack) oldTrack.stop();
        } catch (e) {
          console.warn("Failed to stop old track:", e);
        }

        await p.replaceTrack({ track });
        await p.resume();

        // ✅ Notify server untuk resume
        try {
          const socket = socketRef.current;
          if (socket && p.id) {
            await new Promise((resolve) => {
              socket.emit("resume-producer", { producerId: p.id }, (ack) => {
                console.log("📡 resume-producer response:", ack);
                resolve(ack);
              });
            });
          }
        } catch (e) {
          console.warn("Failed to notify server resume:", e);
        }

        setLocalStream(stream);
        setCamOn(true);

        console.log("✅ Camera restarted successfully");
        return;
      }

      console.log("🆕 Creating new video producer");
      const newProducer = await transport.produce({
        track,
        appData: { type: "cam", peerId },
      });

      videoProducerRef.current = newProducer;
      setLocalStream(stream);
      setCamOn(true);

      newProducer.on("trackended", () => {
        console.log("📹 Track ended");
        stopCam();
      });

      newProducer.on("transportclose", () => {
        console.log("📹 Transport closed");
        setCamOn(false);
        setLocalStream(null);
        if (videoProducerRef.current === newProducer) {
          videoProducerRef.current = null;
        }
      });

      newProducer.on("close", () => {
        console.log("📹 Producer closed");
        if (videoProducerRef.current === newProducer) {
          videoProducerRef.current = null;
        }
      });

      console.log("✅ New camera started successfully");
    } catch (e) {
      console.error("❌ startCam failed:", e);
      setError(e?.message || String(e));
      setCamOn(false);

      try {
        localStream?.getTracks()?.forEach((t) => t.stop());
      } catch {}
      setLocalStream(null);
    }
  }, [peerId, localStream]);

  const stopCam = useCallback(async () => {
    console.log("🛑 Stopping camera");
    const p = videoProducerRef.current;

    if (!p) {
      console.log("⚠️ No producer to stop");
      return;
    }

    try {
      if (!p.closed) {
        await p.pause();
        console.log("⏸️ Producer paused");
      }
    } catch (e) {
      console.warn("Failed to pause producer:", e);
    }

    // ✅ PENTING: Notify server bahwa producer di-pause
    try {
      const socket = socketRef.current;
      if (socket && p.id) {
        await new Promise((resolve) => {
          socket.emit("pause-producer", { producerId: p.id }, (ack) => {
            console.log("📡 pause-producer response:", ack);
            resolve(ack);
          });
        });
      }
    } catch (e) {
      console.warn("Failed to notify server pause:", e);
    }

    try {
      if (p.track) {
        p.track.stop();
        console.log("🎥 Track stopped");
      }
    } catch (e) {
      console.warn("Failed to stop track:", e);
    }

    try {
      localStream?.getTracks()?.forEach((t) => t.stop());
    } catch {}

    setLocalStream(null);
    setCamOn(false);

    console.log("✅ Camera stopped");
  }, [localStream]);

  const muteAllOthers = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket) return { ok: false, error: "socket not ready" };
    return new Promise((resolve) => {
      socket.emit("host-mute-all", { roomId, exceptPeerId: peerId }, (res) =>
        resolve(res)
      );
    });
  }, [roomId, peerId]);

  return {
    ready,
    error,
    remotePeers,
    micOn,
    camOn,
    startMic,
    stopMic,
    startCam,
    stopCam,
    localStream,
    muteAllOthers,
  };
}
