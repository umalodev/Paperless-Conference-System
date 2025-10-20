const mediasoup = require("mediasoup");
const socketIo = require("socket.io");
const http = require("http");
const winston = require("winston");

// Configure logging
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "media-server" },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// MediaSoup configuration
const config = {
  mediasoup: {
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: "warn",
      logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
    },
    router: {
      mediaCodecs: [
        {
          kind: "audio",
          mimeType: "audio/opus",
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: "video",
          mimeType: "video/VP8",
          clockRate: 90000,
          parameters: {
            "x-google-start-bitrate": 1000,
          },
        },
        {
          kind: "video",
          mimeType: "video/H264",
          clockRate: 90000,
          parameters: {
            "packetization-mode": 1,
            "profile-level-id": "42e01f",
            "level-asymmetry-allowed": 1,
          },
        },
      ],
    },
    webRtcTransport: {
      listenIps: [
        {
          ip: "0.0.0.0",
          //http:
          announcedIp: "192.168.1.8",
        },
      ],
      initialAvailableOutgoingBitrate: 1000000,
      minimumAvailableOutgoingBitrate: 600000,
      maxSctpMessageSize: 262144,
      maxIncomingBitrate: 1500000,
    },
  },
};

// Global variables
let worker;
let rooms = new Map();

// Create HTTP server
const server = http.createServer();
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Initialize MediaSoup worker
async function runMediasoupWorker() {
  try {
    worker = await mediasoup.createWorker(config.mediasoup.worker);
    logger.info("MediaSoup worker created", { pid: worker.pid });

    worker.on("died", () => {
      logger.error("MediaSoup worker died, exiting in 2 seconds...", {
        pid: worker.pid,
      });
      setTimeout(() => process.exit(1), 2000);
    });

    return worker;
  } catch (error) {
    logger.error("Failed to create MediaSoup worker:", error);
    throw error;
  }
}

// Create or get room
async function getOrCreateRoom(roomId) {
  let room = rooms.get(roomId);

  if (!room) {
    const router = await worker.createRouter(config.mediasoup.router);

    room = {
      id: roomId,
      router,
      peers: new Map(),
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
    };

    rooms.set(roomId, room);
    logger.info("Room created", { roomId });
  }

  return room;
}

// Handle socket connections
io.on("connection", (socket) => {
  logger.info("Client connected", { socketId: socket.id });

  socket.on("join-room", async (data) => {
    try {
      const { roomId, roomName, peerId, displayName } = data; // 🟩 displayName optional
      logger.info("Peer joining room", { roomId, peerId, socketId: socket.id });

      const room = await getOrCreateRoom(roomId);

      // Store peer info
      room.peers.set(socket.id, {
        id: peerId,
        socket,
        transports: new Set(),
        producers: new Set(),
        consumers: new Set(),
        displayName: displayName || `User-${peerId || socket.id}`,
      });

      socket.join(roomId);

      // Send router RTP capabilities
      socket.emit("router-rtp-capabilities", {
        rtpCapabilities: room.router.rtpCapabilities,
      });

      // Kirim producer yang sudah ada
      const existing = [];
      for (const p of room.producers.values()) {
        existing.push({
          producerId: p.id,
          kind: p.kind,
          peerId: p.appData?.peerId || null,
        });
      }
      socket.emit("existing-producers", existing);

      // 🟩 Kirim daftar peserta aktif saat ini ke client baru
      const currentParticipants = Array.from(room.peers.values()).map((p) => ({
        participantId: p.id,
        displayName: p.displayName,
      }));
      socket.emit("participants_list", currentParticipants);

      // 🟩 Broadcast ke semua peserta lain bahwa peserta baru bergabung
      socket.to(roomId).emit("message", {
        type: "participant_joined",
        participantId: peerId || socket.id,
        displayName: displayName || `User-${peerId || socket.id}`,
      });

      // Notify other peers (existing media logic)
      socket.to(roomId).emit("peer-joined", { peerId, socketId: socket.id });
    } catch (error) {
      logger.error("Failed to join room:", error);
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  socket.on("create-transport", async (data) => {
    try {
      const { direction, roomId } = data;
      const room = await getOrCreateRoom(roomId);

      const transport = await room.router.createWebRtcTransport(
        config.mediasoup.webRtcTransport
      );

      // Store transport
      room.transports.set(transport.id, transport);

      // Add to peer's transports
      const peer = room.peers.get(socket.id);
      if (peer) {
        peer.transports.add(transport.id);
      }

      // Handle transport events
      transport.on("dtlsstatechange", (dtlsState) => {
        if (dtlsState === "closed") {
          logger.info("Transport closed", { transportId: transport.id });
        }
      });

      transport.on("close", () => {
        logger.info("Transport closed", { transportId: transport.id });
        room.transports.delete(transport.id);
      });

      socket.emit("transport-created", {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        sctpParameters: transport.sctpParameters,
      });
    } catch (error) {
      logger.error("Failed to create transport:", error);
      socket.emit("error", { message: "Failed to create transport" });
    }
  });

  socket.on("pause-producer", async ({ producerId }, cb = () => {}) => {
    try {
      const room = findRoomByProducerId(producerId);
      if (!room) return cb({ ok: false, error: "room or producer not found" });
      const producer = room.producers.get(producerId);
      if (!producer) return cb({ ok: false, error: "producer not found" });

      await producer.pause();
      logger.info("Producer paused by client", { producerId });
      const ownerPeerId = producer.appData?.peerId || null;
      io.to(room.id).emit("producer-paused", {
        roomId: room.id,
        producerId,
        peerId: ownerPeerId,
        kind: producer.kind,
      });
      cb({ ok: true });
    } catch (e) {
      logger.error("pause-producer failed", e);

      cb({ ok: false, error: e?.message || String(e) });
    }
  });

  socket.on("resume-producer", async ({ producerId }, cb = () => {}) => {
    try {
      const room = findRoomByProducerId(producerId);
      if (!room) return cb({ ok: false, error: "room or producer not found" });
      const producer = room.producers.get(producerId);
      if (!producer) return cb({ ok: false, error: "producer not found" });

      await producer.resume();
      logger.info("Producer resumed by client", { producerId });
      const ownerPeerId = producer.appData?.peerId || null;
      io.to(room.id).emit("producer-resumed", {
        roomId: room.id,
        producerId,
        peerId: ownerPeerId,
        kind: producer.kind,
      });
      cb({ ok: true });
    } catch (e) {
      logger.error("resume-producer failed", e);
      cb({ ok: false, error: e?.message || String(e) });
    }
  });

  socket.on("close-producer", async ({ producerId }, cb = () => {}) => {
    try {
      const room = findRoomByProducerId(producerId);
      if (!room) return cb({ ok: false, error: "room or producer not found" });

      const producer = room.producers.get(producerId);
      if (!producer) return cb({ ok: false, error: "producer not found" });

      producer.close();
      logger.info("Producer closed by client", { producerId });
      cb({ ok: true });
    } catch (e) {
      logger.error("close-producer failed", e);
      cb({ ok: false, error: e?.message || String(e) });
    }
  });

  socket.on("connect-transport", async (data) => {
    try {
      const { transportId, dtlsParameters } = data;
      const room = Array.from(rooms.values()).find((r) =>
        r.transports.has(transportId)
      );

      if (room) {
        const transport = room.transports.get(transportId);
        await transport.connect({ dtlsParameters });
        logger.info("Transport connected", { transportId });
      }
    } catch (error) {
      logger.error("Failed to connect transport:", error);
      socket.emit("error", { message: "Failed to connect transport" });
    }
  });

  socket.on("produce", async (data) => {
    try {
      const { transportId, kind, rtpParameters, appData = {}, roomId } = data;
      const room = await getOrCreateRoom(roomId);
      const transport = room.transports.get(transportId);

      if (!transport) {
        throw new Error("Transport not found");
      }
      const peer = room.peers.get(socket.id);
      const producer = await transport.produce({
        kind,
        rtpParameters,
        appData: { ...appData, peerId: peer?.id || socket.id },
      });

      // Store producer
      room.producers.set(producer.id, producer);

      // Add to peer's producers

      if (peer) {
        peer.producers.add(producer.id);
      }

      // Handle producer events
      producer.on("transportclose", () => {
        logger.info("Producer transport closed", { producerId: producer.id });
      });

      producer.on("close", () => {
        logger.info("Producer closed", { producerId: producer.id });
        room.producers.delete(producer.id);
      });

      socket.emit("produced", { id: producer.id });

      // Notify other peers about new producer
      socket.to(roomId).emit("new-producer", {
        producerId: producer.id,
        kind: producer.kind,
        peerId: peer?.id || socket.id,
      });
    } catch (error) {
      logger.error("Failed to produce:", error);
      socket.emit("error", { message: "Failed to produce" });
    }
  });

  socket.on("consume", async (data) => {
    try {
      const { transportId, producerId, rtpCapabilities, paused, roomId } = data;
      const room = await getOrCreateRoom(roomId);
      const transport = room.transports.get(transportId);
      const producer = room.producers.get(producerId);

      if (!transport || !producer) {
        throw new Error("Transport or producer not found");
      }

      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        logger.warn("canConsume=false", {
          roomId,
          producerId,
          producerKind: producer.kind,
          // sedikit konteks codec
          producerCodecs: producer.rtpParameters?.codecs?.map(
            (c) => c.mimeType
          ),
          consumerCodecs: (rtpCapabilities?.codecs || []).map(
            (c) => c.mimeType
          ),
        });
        throw new Error("Cannot consume this producer");
      }
      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused,
      });

      // Store consumer
      room.consumers.set(consumer.id, consumer);

      // Add to peer's consumers
      const peer = room.peers.get(socket.id);
      if (peer) {
        peer.consumers.add(consumer.id);
      }

      // Handle consumer events
      consumer.on("transportclose", () => {
        logger.info("Consumer transport closed", { consumerId: consumer.id });
      });

      consumer.on("close", () => {
        logger.info("Consumer closed", { consumerId: consumer.id });
        room.consumers.delete(consumer.id);
      });

      socket.emit("consumed", {
        id: consumer.id,
        producerId: producer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
        producerPaused: consumer.producerPaused,
      });
    } catch (error) {
      logger.error("Failed to consume:", error);
      socket.emit("error", { message: "Failed to consume" });
    }
  });

  socket.on("resume-consumer", async (data) => {
    try {
      const { consumerId } = data;
      const room = Array.from(rooms.values()).find((r) =>
        r.consumers.has(consumerId)
      );

      if (room) {
        const consumer = room.consumers.get(consumerId);
        await consumer.resume();
        logger.info("Consumer resumed", { consumerId });
      }
    } catch (error) {
      logger.error("Failed to resume consumer:", error);
      socket.emit("error", { message: "Failed to resume consumer" });
    }
  });

  socket.on("pause-consumer", async (data) => {
    try {
      const { consumerId } = data;
      const room = Array.from(rooms.values()).find((r) =>
        r.consumers.has(consumerId)
      );

      if (room) {
        const consumer = room.consumers.get(consumerId);
        await consumer.pause();
        logger.info("Consumer paused", { consumerId });
      }
    } catch (error) {
      logger.error("Failed to pause consumer:", error);
      socket.emit("error", { message: "Failed to pause consumer" });
    }
  });

  socket.on("get-producers", ({ roomId, rtpCapabilities }, cb = () => {}) => {
    try {
      const room = rooms.get(roomId);

      const list = [];
      if (room) {
        for (const p of room.producers.values()) {
          // skip producer milik diri sendiri (opsional, tapi rapi)
          const myPeer = room.peers.get(socket.id);
          if (p.appData?.peerId && myPeer?.id && p.appData.peerId === myPeer.id)
            continue;
          // hanya kirim yang benar2 bisa di-consume oleh device ini
          if (room.router.canConsume({ producerId: p.id, rtpCapabilities })) {
            list.push({
              producerId: p.id,
              kind: p.kind,
              peerId: p.appData?.peerId || null,
            });
          }
        }
      }
      cb({ ok: true, producers: list });
    } catch (err) {
      cb({ ok: false, error: err?.message || String(err) });
    }
  });

  socket.on(
    "host-mute-all",
    async ({ roomId, exceptPeerId }, cb = () => {}) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return cb({ ok: false, error: "room not found" });

        let mutedCount = 0;
        // pause semua audio producer
        for (const producer of room.producers.values()) {
          if (producer.kind !== "audio") continue;
          const ownerPeerId = producer.appData?.peerId;
          if (exceptPeerId && ownerPeerId === exceptPeerId) continue;

          try {
            await producer.pause();
          } catch {}
          mutedCount++;

          // info ke pemilik mic bahwa dia di-mute host (opsional tapi bikin UI sinkron)
          const ownerPeer = [...room.peers.values()].find(
            (p) => p.id === ownerPeerId
          );
          ownerPeer?.socket?.emit("muted-by-host", { kind: "audio" });
        }

        cb({ ok: true, muted: mutedCount });
      } catch (e) {
        cb({ ok: false, error: e?.message || String(e) });
      }
    }
  );

  socket.on("disconnect", () => {
    logger.info("Client disconnected", { socketId: socket.id });

    // Clean up peer resources
    for (const [roomId, room] of rooms) {
      const peer = room.peers.get(socket.id);
      if (peer) {
        // Remove peer's transports
        peer.transports.forEach((transportId) => {
          const transport = room.transports.get(transportId);
          if (transport) {
            transport.close();
          }
        });

        // Remove peer's producers
        peer.producers.forEach((producerId) => {
          const producer = room.producers.get(producerId);
          if (producer) {
            producer.close();
          }
        });

        // Remove peer's consumers
        peer.consumers.forEach((consumerId) => {
          const consumer = room.consumers.get(consumerId);
          if (consumer) {
            consumer.close();
          }
        });

        // Remove peer
        room.peers.delete(socket.id);

        // 🟩 Broadcast ke semua peserta lain bahwa user ini keluar
        socket.to(roomId).emit("message", {
          type: "participant_left",
          participantId: peer.id,
          displayName: peer.displayName,
        });

        // Notify other peers
        socket
          .to(roomId)
          .emit("peer-left", { peerId: peer.id, socketId: socket.id });

        // Clean up empty rooms
        if (room.peers.size === 0) {
          room.router.close();
          rooms.delete(roomId);
          logger.info("Room closed", { roomId });
        }

        break;
      }
    }
  });
});

// Start server
async function startServer() {
  try {
    await runMediasoupWorker();

    const port = process.env.MEDIA_PORT || 3002;
    server.listen(port, "0.0.0.0", () => {
      logger.info(`Media server running on port ${port}`);
    });
  } catch (error) {
    logger.error("Failed to start media server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  logger.info("Shutting down media server...");

  if (worker) {
    worker.close();
  }

  server.close(() => {
    logger.info("Media server shut down");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  logger.info("Shutting down media server...");

  if (worker) {
    worker.close();
  }

  server.close(() => {
    logger.info("Media server shut down");
    process.exit(0);
  });
});

// Start the server
startServer();

function findRoomByProducerId(producerId) {
  for (const room of rooms.values()) {
    if (room.producers.has(producerId)) return room;
  }
  return null;
}
