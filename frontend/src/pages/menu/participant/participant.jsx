// src/pages/menu/participants.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import BottomNav from "../../../components/BottomNav.jsx";
import Icon from "../../../components/Icon.jsx";
import "./participant.css";
import { API_URL, MEDIA_URL } from "../../../config.js";
import { useNavigate } from "react-router-dom";
import useMeetingGuard from "../../../hooks/useMeetingGuard.js";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import MeetingLayout from "../../../components/MeetingLayout.jsx";
import meetingService from "../../../services/meetingService.js";

// NEW: mediasoup & socket.io
import * as mediasoupClient from "mediasoup-client";
import { io as socketIO } from "socket.io-client";

/**
 * useMediasoupRoom – hook untuk:
 * - connect ke media server (socket.io)
 * - load device
 * - create send/recv transports
 * - produce local mic/cam
 * - consume semua producer participant lain
 */
function useMediasoupRoom({ roomId, peerId }) {
  const socketRef = useRef(null);
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const audioProducerRef = useRef(null);
  const videoProducerRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  // peerId -> { stream, consumers:Set, name? }
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
      next.set(peerId, cur);
      return next;
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
        +socket.io.on("reconnect_attempt", (n) => {
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

        socket.on("existing-producers", async (list) => {
          for (const item of list || []) {
            try {
              await consumeOne({
                socket,
                device,
                recvTransport,
                producerId: item.producerId,
                ownerPeerId: item.peerId || "unknown",
              });
            } catch (e) {
              console.error("consume existing error", e);
            }
          }
        });

        // 8) clean-up when someone leaves (server already handles consumer close by transport close)
        socket.on("peer-left", ({ peerId: leftPeerId }) => {
          setRemotePeers((prev) => {
            const next = new Map(prev);
            next.delete(leftPeerId);
            return next;
          });
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

          // add track to that peer’s stream
          updateRemotePeer(ownerPeerId, (cur) => {
            const stream = cur.stream || new MediaStream();
            stream.addTrack(consumer.track);
            cur.stream = stream;
            cur.consumers.add(consumer.id);
            return { ...cur };
          });

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
    if (audioProducerRef.current || !sendTransportRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    const track = stream.getAudioTracks()[0];
    const p = await sendTransportRef.current.produce({
      track,
      appData: { type: "mic", peerId },
    });
    audioProducerRef.current = p;
    setMicOn(true);

    p.on("trackended", () => stopMic());
    p.on("transportclose", () => setMicOn(false));
  }, [peerId]);

  const stopMic = useCallback(() => {
    if (!audioProducerRef.current) return;
    try {
      audioProducerRef.current.close();
    } catch {}
    audioProducerRef.current = null;
    setMicOn(false);
  }, []);

  // PUBLIC: toggle cam
  const startCam = useCallback(async () => {
    if (videoProducerRef.current || !sendTransportRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { width: 1280, height: 720 },
    });
    const track = stream.getVideoTracks()[0];
    const p = await sendTransportRef.current.produce({
      track,
      appData: { type: "cam", peerId },
    });
    videoProducerRef.current = p;
    setLocalStream(stream);
    setCamOn(true);

    p.on("trackended", () => stopCam());
    p.on("transportclose", () => setCamOn(false));
  }, [peerId]);

  const stopCam = useCallback(() => {
    if (!videoProducerRef.current) return;
    try {
      videoProducerRef.current.close();
    } catch {}
    videoProducerRef.current = null;
    try {
      localStream?.getTracks().forEach((t) => t.stop());
    } catch {}
    setLocalStream(null);
    setCamOn(false);
  }, []);

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
  };
}

export default function ParticipantsPage() {
  const [user, setUser] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");

  const [query, setQuery] = useState("");
  const [participants, setParticipants] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [errList, setErrList] = useState("");

  const [activeTab, setActiveTab] = useState("list");

  const navigate = useNavigate();
  const meetingId = useMemo(() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || cm?.code || null;
    } catch {
      return null;
    }
  }, []);

  // who am I
  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  // BottomNav menus (unchanged)
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingMenus(true);
        setErrMenus("");
        const res = await fetch(`${API_URL}/api/menu/user/menus`, {
          headers: meetingService.getAuthHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = Array.isArray(json?.data)
          ? json.data.map((m) => ({
              slug: m.slug,
              label: m.displayLabel,
              iconUrl: m.iconMenu || null,
              flag: m.flag ?? "Y",
            }))
          : [];
        if (!cancel) setMenus(list);
      } catch (e) {
        if (!cancel) setErrMenus(String(e.message || e));
      } finally {
        if (!cancel) setLoadingMenus(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // Participants polling (unchanged)
  useEffect(() => {
    let cancel = false;

    const loadParticipants = async () => {
      try {
        setLoadingList(true);
        setErrList("");

        const qs = meetingId
          ? `?meetingId=${encodeURIComponent(meetingId)}`
          : "";
        let res = await fetch(`${API_URL}/api/participants/joined${qs}`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          res = await fetch(`${API_URL}/api/participants/test-data`, {
            headers: { "Content-Type": "application/json" },
          });
        }
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const json = await res.json();

        if (!cancel) {
          if (json.success) {
            const fresh = Array.isArray(json.data) ? json.data : [];
            setParticipants((prev) => {
              if (prev.length === 0) {
                return [...fresh].sort((a, b) => {
                  const ta = new Date(a.joinTime || a.createdAt || 0).getTime();
                  const tb = new Date(b.joinTime || b.createdAt || 0).getTime();
                  return ta - tb;
                });
              }
              const freshById = new Map(fresh.map((p) => [p.id, p]));
              const prevIds = new Set(prev.map((p) => p.id));
              const merged = prev.map((old) => {
                const f = freshById.get(old.id);
                return f ? { ...old, ...f } : old;
              });
              fresh.forEach((p) => {
                if (!prevIds.has(p.id)) merged.push(p);
              });
              return merged;
            });
          } else {
            setErrList(json.message || "Failed to load participants");
          }
        }
      } catch (e) {
        if (!cancel) setErrList(String(e.message || e));
      } finally {
        if (!cancel) setLoadingList(false);
      }
    };

    loadParticipants();
    const interval = setInterval(loadParticipants, 5000);
    return () => {
      cancel = true;
      clearInterval(interval);
    };
  }, [meetingId]);

  const visibleMenus = useMemo(
    () => (menus || []).filter((m) => (m?.flag ?? "Y") === "Y"),
    [menus]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.role || "").toLowerCase().includes(q)
    );
  }, [participants, query]);

  const totals = useMemo(() => {
    const total = participants.length;
    const micOn = participants.filter((p) => p.mic).length;
    const camOn = participants.filter((p) => p.cam).length;
    return { total, micOn, camOn };
  }, [participants]);

  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  // Update status mic/cam (ke DB) — tetap
  const updateParticipantStatus = async (participantId, updates) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      const dbUpdates = {};
      if (updates.mic !== undefined) dbUpdates.isAudioEnabled = updates.mic;
      if (updates.cam !== undefined) dbUpdates.isVideoEnabled = updates.cam;
      if (updates.isScreenSharing !== undefined)
        dbUpdates.isScreenSharing = updates.isScreenSharing;

      const res = await fetch(
        `${API_URL}/api/participants/${participantId}/status`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dbUpdates),
        }
      );

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();

      if (json.success) {
        setParticipants((prev) =>
          prev.map((p) => (p.id === participantId ? { ...p, ...updates } : p))
        );
      } else {
        console.error("Failed to update participant status:", json.message);
      }
    } catch (error) {
      console.error("Error updating participant status:", error);
    }
  };

  // ====== NEW: hook mediasoup
  const myPeerId = user?.id || localStorage.getItem("userId") || "me";
  const {
    ready: mediaReady,
    error: mediaError,
    remotePeers,
    micOn,
    camOn,
    startMic,
    stopMic,
    startCam,
    stopCam,
    localStream,
  } = useMediasoupRoom({ roomId: meetingId, peerId: String(myPeerId) });

  // wiring tombol footer -> media produce/close + update DB flag utk current user
  const onToggleMic = useCallback(() => {
    if (!mediaReady) return;
    if (micOn) {
      stopMic();
      // optional: update DB status untuk diri sendiri (jika ada id participant)
    } else {
      startMic();
    }
  }, [mediaReady, micOn, startMic, stopMic]);

  const onToggleCam = useCallback(() => {
    if (!mediaReady) return;
    if (camOn) {
      stopCam();
    } else {
      startCam();
    }
  }, [mediaReady, camOn, startCam, stopCam]);

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  return (
    <MeetingLayout
      meetingId={meetingId}
      userId={user?.id}
      userRole={user?.role || "participant"}
      socket={null}
      mediasoupDevice={null}
    >
      <div className="pd-app">
        {/* Top bar */}
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <div>
              <h1 className="pd-title">Participants</h1>
              <div className="pd-sub">Manage attendees & seats</div>
            </div>
          </div>
          <div className="pd-right">
            <div className="pd-clock" aria-live="polite">
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="pd-user">
              <div className="pd-avatar">
                {(user?.username || "US").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="pd-user-name">
                  {user?.username || "Participant"}
                </div>
                <div className="pd-user-role">Participant</div>
              </div>
            </div>
          </div>
        </header>

        <main className="pd-main">
          <section className="prt-wrap">
            {/* TAB BAR */}
            <div className="prt-tabs">
              <button
                className={`prt-tab${activeTab === "list" ? " active" : ""}`}
                onClick={() => setActiveTab("list")}
              >
                List
              </button>
              <button
                className={`prt-tab${activeTab === "video" ? " active" : ""}`}
                onClick={() => setActiveTab("video")}
              >
                Video Grid
              </button>
            </div>

            {/* CONTENT: LIST (existing) */}
            {activeTab === "list" && (
              <>
                <div className="prt-header">
                  <div className="prt-search">
                    <span className="prt-search-icon">
                      <Icon slug="search" />
                    </span>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search name, role, or seat…"
                      aria-label="Search participants"
                    />
                  </div>
                  <div className="prt-actions">
                    <button className="prt-btn" title="Invite">
                      <Icon slug="invite" />
                      <span>Invite</span>
                    </button>
                    <button className="prt-btn ghost" title="Sort">
                      <Icon slug="sort" />
                      <span>Sort</span>
                    </button>
                  </div>
                </div>

                <div className="prt-summary">
                  <div className="prt-card">
                    <div className="prt-card-icon">
                      <Icon slug="users" />
                    </div>
                    <div>
                      <div className="prt-card-title">{totals.total}</div>
                      <div className="prt-card-sub">Total</div>
                    </div>
                  </div>
                  <div className="prt-card">
                    <div className="prt-card-icon">
                      <Icon slug="mic" />
                    </div>
                    <div>
                      <div className="prt-card-title">{totals.micOn}</div>
                      <div className="prt-card-sub">Mic On</div>
                    </div>
                  </div>
                  <div className="prt-card">
                    <div className="prt-card-icon">
                      <Icon slug="camera" />
                    </div>
                    <div>
                      <div className="prt-card-title">{totals.camOn}</div>
                      <div className="prt-card-sub">Cam On</div>
                    </div>
                  </div>
                </div>

                {loadingList && (
                  <div className="pd-empty">Loading participants…</div>
                )}
                {errList && !loadingList && (
                  <div className="pd-error">
                    Gagal memuat peserta: {errList}
                  </div>
                )}

                {!loadingList && !errList && (
                  <div className="prt-grid">
                    {filtered.map((p) => (
                      <div key={p.id} className="prt-item">
                        <div className="prt-avatar">
                          {(p.name || "?").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="prt-info">
                          <div className="prt-name">{p.name}</div>
                          <div className="prt-meta">
                            <span className="prt-role">{p.role}</span>
                          </div>
                          {p.joinTime && (
                            <div className="prt-join-time">
                              Joined:{" "}
                              {new Date(p.joinTime).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                        <div className="prt-status">
                          <button
                            className={`prt-pill ${p.mic ? "on" : "off"}`}
                            title={
                              p.mic
                                ? "Mic On - Click to turn off"
                                : "Mic Off - Click to turn on"
                            }
                            onClick={() =>
                              updateParticipantStatus(p.id, { mic: !p.mic })
                            }
                          >
                            <Icon slug="mic" />
                          </button>
                          <button
                            className={`prt-pill ${p.cam ? "on" : "off"}`}
                            title={
                              p.cam
                                ? "Camera On - Click to turn off"
                                : "Camera Off - Click to turn on"
                            }
                            onClick={() =>
                              updateParticipantStatus(p.id, { cam: !p.cam })
                            }
                          >
                            <Icon slug="camera" />
                          </button>
                        </div>
                        <div className="prt-actions-right">
                          <button className="prt-act" title="More">
                            <Icon slug="dots" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {filtered.length === 0 && participants.length === 0 && (
                      <div
                        className="pd-empty"
                        style={{ gridColumn: "1 / -1" }}
                      >
                        Tidak ada peserta yang sedang bergabung dalam meeting
                        saat ini.
                      </div>
                    )}

                    {filtered.length === 0 && participants.length > 0 && (
                      <div
                        className="pd-empty"
                        style={{ gridColumn: "1 / -1" }}
                      >
                        Tidak ada peserta yang cocok dengan pencarian.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* CONTENT: VIDEO GRID (mediasoup) */}
            {activeTab === "video" && (
              <div className="prt-video-grid">
                {mediaError && (
                  <div className="pd-error" style={{ marginBottom: 12 }}>
                    Media error: {mediaError}
                  </div>
                )}
                {!mediaReady ? (
                  <div className="pd-empty">Menyiapkan media…</div>
                ) : (
                  <div className="video-grid">
                    {/* Local preview: tampilkan jika cam aktif */}
                    <VideoTile
                      key="__local__"
                      name={
                        (user?.username || "Me") +
                        (camOn ? "" : " (camera off)")
                      }
                      stream={localStream}
                      placeholder={!camOn}
                      localPreview={camOn}
                    />
                    {/* Remote peers */}
                    {Array.from(remotePeers.entries()).map(([pid, obj]) => {
                      // coba cari nama dari daftar participants (id bisa beda format → fallback pid)
                      const found = participants.find(
                        (p) => String(p.id) === String(pid)
                      );
                      const name = found?.name || `User ${pid.slice(-4)}`;
                      return (
                        <VideoTile key={pid} name={name} stream={obj.stream} />
                      );
                    })}
                    {remotePeers.size === 0 && (
                      <div
                        className="pd-empty"
                        style={{ gridColumn: "1 / -1" }}
                      >
                        Belum ada video dari participant lain.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </main>

        {/* Bottom nav dari DB */}
        {!loadingMenus && !errMenus && (
          <BottomNav
            items={visibleMenus}
            active="participants"
            onSelect={handleSelectNav}
          />
        )}

        {/* Wiring tombol mic/cam ke mediasoup */}
        <MeetingFooter
          userRole={user?.role || "participant"}
          micOn={micOn}
          camOn={camOn}
          onToggleMic={onToggleMic}
          onToggleCam={onToggleCam}
        />
      </div>
    </MeetingLayout>
  );
}

/** VideoTile: render satu kotak video */
function VideoTile({
  name,
  stream,
  placeholder = false,
  localPreview = false,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (stream && stream.getTracks().length) {
      el.srcObject = stream;
      const tryPlay = () => el.play().catch(() => {});
      el.onloadedmetadata = tryPlay;
      tryPlay();
    } else {
      el.srcObject = null;
    }
  }, [stream]);

  return (
    <div className="video-item">
      {placeholder ? (
        <div className="video-dummy">
          <span role="img" aria-label="video">
            🎥
          </span>
        </div>
      ) : (
        <video
          ref={ref}
          playsInline
          autoPlay
          muted={localPreview} // local preview dimute
          className="video-el"
        />
      )}
      <div className="video-name">{name}</div>
    </div>
  );
}
