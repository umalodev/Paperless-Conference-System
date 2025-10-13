import { useState, useEffect, useRef, useCallback } from "react";
import React, { createContext, useContext } from "react";
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
  // local states
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
      // no direct track handle here; track will end when consumer closed
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

      // rapikan: jika tidak ada track lagi, buat stream baru kosong
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
      // Socket.IO v4 punya .timeout(); fallback ke setTimeout kalau versi lama
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

  // Connect & join room
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        if (!roomId || !peerId) return;
        setError("");
        setReady(false);

        // 1) connect socket
        const socket = socketIO(MEDIA_URL, {
          // biarkan default transports (polling -> upgrade WS)
          timeout: 10000, // built-in connect timeout
          path: "/socket.io", // eksplisit (aman kalau ada proxy)
          withCredentials: false,
        });
        socketRef.current = socket;

        // log semua event penting supaya ketahuan akar masalahnya
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

        // 2) join room
        socket.emit("join-room", {
          roomId,
          roomName: `room-${roomId}`,
          peerId,
        });

        // 3) get router rtpCapabilities
        const rtpCaps = await new Promise((resolve, reject) => {
          const onCaps = (payload) => {
            resolve(payload?.rtpCapabilities);
            socket.off("router-rtp-capabilities", onCaps);
          };
          socket.on("router-rtp-capabilities", onCaps);
          setTimeout(() => reject(new Error("No rtpCapabilities")), 10000);
        });

        // 4) load device
        const device = new mediasoupClient.Device();
        await device.load({ routerRtpCapabilities: rtpCaps });
        deviceRef.current = device;

        // 5) create send transport (producer)
        const sendTransport = await createTransport(socket, {
          direction: "send",
          roomId,
        });
        sendTransportRef.current = sendTransport;

        // hookup connect/produce events
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

        // 6) create recv transport (consumer)
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

        // 7) handle new producers from others

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

        // 8) clean-up when someone leaves (server already handles consumer close by transport close)
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
        // close producers
        audioProducerRef.current?.close();
        videoProducerRef.current?.close();
        // close transports
        sendTransportRef.current?.close();
        recvTransportRef.current?.close();
        // close socket
        socketRef.current?.disconnect();
      } catch {}
      deviceRef.current = null;
      sendTransportRef.current = null;
      recvTransportRef.current = null;
    };
  }, [roomId, peerId]);

  // helpers
  async function createTransport(socket, { direction, roomId }) {
    return new Promise((resolve, reject) => {
      socket.emit("create-transport", { direction, roomId });
      const onCreated = async (payload) => {
        try {
          // payload: id, iceParameters, iceCandidates, dtlsParameters, sctpParameters
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
        // payload: { id, producerId, kind, rtpParameters, type, producerPaused }
        try {
          const consumer = await recvTransport.consume({
            id: payload.id,
            producerId: payload.producerId,
            kind: payload.kind,
            rtpParameters: payload.rtpParameters,
          });

          consumer.on("producerresume", async () => {
            try {
              if (consumer.paused) await consumer.resume();
            } catch {}
            updateRemotePeer(ownerPeerId, (cur) => {
              const info = cur.consumersInfo.get(consumer.id);
              if (info) info.active = true;
              cur.audioActive = [...cur.consumersInfo.values()].some(
                (i) => i.kind === "audio" && i.active
              );
              cur.videoActive = [...cur.consumersInfo.values()].some(
                (i) => i.kind === "video" && i.active
              );
              return { ...cur };
            });
          });

          // Sinkronkan UI kalau server mem-pause/resume consumer (bukan producer)
          consumer.on("pause", () => {
            updateRemotePeer(ownerPeerId, (cur) => {
              const info = cur.consumersInfo.get(consumer.id);
              if (info) info.active = false;
              cur.audioActive = [...cur.consumersInfo.values()].some(
                (i) => i.kind === "audio" && i.active
              );
              cur.videoActive = [...cur.consumersInfo.values()].some(
                (i) => i.kind === "video" && i.active
              );
              return { ...cur };
            });
          });

          consumer.on("resume", async () => {
            // jaga-jaga: kalau autoplay policy, panggil play() lagi via update RemoteAudio (opsional)
            updateRemotePeer(ownerPeerId, (cur) => {
              const info = cur.consumersInfo.get(consumer.id);
              if (info) info.active = true;
              cur.audioActive = [...cur.consumersInfo.values()].some(
                (i) => i.kind === "audio" && i.active
              );
              cur.videoActive = [...cur.consumersInfo.values()].some(
                (i) => i.kind === "video" && i.active
              );
              return { ...cur };
            });
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

          // add track to that peer’s stream
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

          consumer.on("producerpause", () =>
            updateRemotePeer(ownerPeerId, (cur) => {
              const info = cur.consumersInfo.get(consumer.id);
              if (info) info.active = false;
              cur.audioActive = [...cur.consumersInfo.values()].some(
                (i) => i.kind === "audio" && i.active
              );
              cur.videoActive = [...cur.consumersInfo.values()].some(
                (i) => i.kind === "video" && i.active
              );
              return { ...cur };
            })
          );
          consumer.on("producerresume", () =>
            updateRemotePeer(ownerPeerId, (cur) => {
              const info = cur.consumersInfo.get(consumer.id);
              if (info) info.active = true;
              cur.audioActive = [...cur.consumersInfo.values()].some(
                (i) => i.kind === "audio" && i.active
              );
              cur.videoActive = [...cur.consumersInfo.values()].some(
                (i) => i.kind === "video" && i.active
              );
              return { ...cur };
            })
          );

          // when consumer ends/transport closes
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

  // PUBLIC: toggle mic
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

      // SATUKAN ke satu variabel
      let p = audioProducerRef.current;
      if (p?.closed) p = null;

      if (p) {
        await p.replaceTrack({ track });
        await p.resume(); // resume sisi client
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

      // PENTING: sinkronkan ke server (producer sebelumnya di-pause saat "mute all")
      try {
        const socket = socketRef.current;
        if (socket && p?.id) {
          socket.emit("resume-producer", { producerId: p.id }, (ack) => {
            if (!ack?.ok) console.warn("resume-producer failed:", ack?.error);
          });
        }
      } catch {}

      // rapikan stream lokal
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

  // PUBLIC: toggle cam
  // dalam useMediasoupRoom
  const startCam = useCallback(async () => {
    const transport = sendTransportRef.current;
    if (!transport || transport.closed) {
      setError("send transport not ready");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { width: 1280, height: 720 },
      });
      const track = stream.getVideoTracks()[0];

      let p = videoProducerRef.current;
      // ⛑️ kalau ada producer tapi sudah closed, anggap tidak ada
      if (p?.closed) p = null;

      if (p) {
        try {
          await p.replaceTrack({ track });
          await p.resume();
          setLocalStream(stream);
          setCamOn(true);
          return;
        } catch (e) {
          // jika gagal karena state closed/invalid, fallback buat producer baru
          console.warn("resume/replaceTrack failed, recreating producer:", e);
          try {
            p.close?.();
          } catch {}
          videoProducerRef.current = null;
        }
      }

      // buat producer baru
      const newProducer = await transport.produce({
        track,
        appData: { type: "cam", peerId },
      });
      videoProducerRef.current = newProducer;
      setLocalStream(stream);
      setCamOn(true);

      newProducer.on("trackended", () => stopCam());
      newProducer.on("transportclose", () => {
        setCamOn(false);
        videoProducerRef.current = null; // ❗ penting: buang ref saat transport tutup
      });
      newProducer.on("close", () => {
        // ❗ penting: buang ref saat producer close
        if (videoProducerRef.current === newProducer)
          videoProducerRef.current = null;
      });
    } catch (e) {
      console.error("startCam failed", e);
      setError(e?.message || String(e));
      setCamOn(false);
      try {
        localStream?.getTracks()?.forEach((t) => t.stop());
      } catch {}
      setLocalStream(null);
    }
  }, [peerId, localStream]);

  const stopCam = useCallback(async () => {
    const p = videoProducerRef.current;
    try {
      await p?.pause?.();
    } catch {}
    try {
      p?.track?.stop?.();
    } catch {}
    try {
      localStream?.getTracks()?.forEach((t) => t.stop());
    } catch {}
    videoProducerRef.current = null; // ❗ jangan biarkan ref ke producer closed
    setLocalStream(null);
    setCamOn(false);
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
    remotePeers, // Map<peerId, {stream, consumers}>
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
