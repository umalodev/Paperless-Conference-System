// src/pages/menu/participants.jsx
import React, { useEffect, useMemo, useState } from "react";
import BottomNav from "../../../components/BottomNav.jsx";
import Icon from "../../../components/Icon.jsx";
import "./participant.css";
import { API_URL } from "../../../config.js";
import { useNavigate } from "react-router-dom";
import useMeetingGuard from "../../../hooks/useMeetingGuard.js";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import MeetingLayout from "../../../components/MeetingLayout.jsx";
import meetingService from "../../../services/meetingService.js";
import VideoTile from "../../../components/VideoTile.jsx";
import useMeetingRTC from "../../../hooks/useMeetingRTC.js";
import meetingWebSocketService from "../../../services/meetingWebSocket.js";

export default function ParticipantsPage() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");

  const [query, setQuery] = useState("");
  const [participants, setParticipants] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [errList, setErrList] = useState("");

  const [activeTab, setActiveTab] = useState("video"); // "video" | "list"
  const [wsConn, setWsConn] = useState(null); // socket dari service
  const [participantMediaStates, setParticipantMediaStates] = useState(
    new Map()
  ); // peerId -> {micOn, camOn}

  const navigate = useNavigate();

  const meetingId = useMemo(() => {
    try {
      const cm = JSON.parse(localStorage.getItem("currentMeeting") || "null");
      return cm?.id || cm?.meetingId || cm?.code || null;
    } catch {
      return null;
    }
  }, []);

  // --- CONNECT WS via service (dengan token) ---
  useEffect(() => {
    if (!meetingId) return;
    const me = user;
    if (!me?.id) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    meetingWebSocketService.connect(meetingId, me.id, API_URL, token);

    // tunggu sampai OPEN lalu set ke state agar trigger re-render
    let t = setInterval(() => {
      const s = meetingWebSocketService.getSocket();
      if (s && s.readyState === WebSocket.OPEN) {
        setWsConn(s);
        clearInterval(t);
      }
    }, 200);

    return () => {
      clearInterval(t);
      meetingWebSocketService.disconnect();
      setWsConn(null);
    };
  }, [meetingId, user?.id]);

  // Listen to WebSocket messages for media state updates
  useEffect(() => {
    if (!wsConn) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "media-toggle" && data.from) {
          setParticipantMediaStates((prev) => {
            const newStates = new Map(prev);
            const currentState = newStates.get(data.from) || {
              micOn: true,
              camOn: true,
            };

            if (data.audio !== undefined) {
              currentState.micOn = data.audio;
            }
            if (data.video !== undefined) {
              currentState.camOn = data.video;
            }

            newStates.set(data.from, currentState);
            console.log(`Updated media state for ${data.from}:`, currentState);
            return newStates;
          });
        }

        if (data.type === "participant_state") {
          setParticipantMediaStates((prev) => {
            const newStates = new Map(prev);
            newStates.set(data.participantId, {
              micOn: data.micOn,
              camOn: data.camOn,
            });
            return newStates;
          });
        }
      } catch (error) {
        console.warn("Error parsing WebSocket message:", error);
      }
    };

    wsConn.addEventListener("message", handleMessage);
    return () => wsConn.removeEventListener("message", handleMessage);
  }, [wsConn]);

  // --- WebRTC (mic/cam & remote) ---
  const {
    localStream,
    remoteStreams,
    micOn,
    camOn,
    toggleMic,
    toggleCam,
    connectedPeers,
  } = useMeetingRTC({
    meetingId,
    userId: user?.id,
    ws: wsConn, // gunakan socket dari service
  });

  // Update local media state in the map
  useEffect(() => {
    if (user?.id) {
      setParticipantMediaStates((prev) => {
        const newStates = new Map(prev);
        newStates.set(String(user.id), { micOn, camOn });
        return newStates;
      });
    }
  }, [user?.id, micOn, camOn]);

  // --- Menus ---
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

  // --- Participants (polling) ---
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
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancel) {
          if (json.success) {
            const fresh = Array.isArray(json.data) ? json.data : [];
            setParticipants((prev) => {
              if (prev.length === 0) {
                return [...fresh].sort(
                  (a, b) =>
                    new Date(a.joinTime || a.createdAt || 0) -
                    new Date(b.joinTime || b.createdAt || 0)
                );
              }
              const freshById = new Map(fresh.map((p) => [p.id, p]));
              const prevIds = new Set(prev.map((p) => p.id));
              const merged = prev.map((old) =>
                freshById.get(old.id)
                  ? { ...old, ...freshById.get(old.id) }
                  : old
              );
              fresh.forEach((p) => {
                if (!prevIds.has(p.id)) merged.push(p);
              });
              return merged;
            });
          } else setErrList(json.message || "Failed to load participants");
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
        (p.role || "").toLowerCase().includes(q) ||
        (p.seat || "").toLowerCase().includes(q)
    );
  }, [participants, query]);

  const totals = useMemo(() => {
    const total = participants.length;
    const micOnCount = Array.from(participantMediaStates.values()).filter(
      (state) => state.micOn
    ).length;
    const camOnCount = Array.from(participantMediaStates.values()).filter(
      (state) => state.camOn
    ).length;
    return { total, micOn: micOnCount, camOn: camOnCount };
  }, [participants, participantMediaStates]);

  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  const updateParticipantStatus = async (participantId, updates) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const dbUpdates = {};
      if (updates.mic !== undefined) dbUpdates.isAudioEnabled = updates.mic;
      if (updates.cam !== undefined) dbUpdates.isVideoEnabled = updates.cam;

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setParticipants((prev) =>
          prev.map((p) => (p.id === participantId ? { ...p, ...updates } : p))
        );

        // Update local media states
        setParticipantMediaStates((prev) => {
          const newStates = new Map(prev);
          const currentState = newStates.get(String(participantId)) || {
            micOn: true,
            camOn: true,
          };
          if (updates.mic !== undefined) currentState.micOn = updates.mic;
          if (updates.cam !== undefined) currentState.camOn = updates.cam;
          newStates.set(String(participantId), currentState);
          return newStates;
        });
      } else {
        console.error("Failed to update participant status:", json.message);
      }
    } catch (error) {
      console.error("Error updating participant status:", error);
    }
  };

  const handleMicToggle = (participantId, currentStatus) => {
    updateParticipantStatus(participantId, { mic: !currentStatus });
  };

  const handleCameraToggle = (participantId, currentStatus) => {
    updateParticipantStatus(participantId, { cam: !currentStatus });
  };

  // Get media state for a participant
  const getParticipantMediaState = (participantId) => {
    const state = participantMediaStates.get(String(participantId));
    return state || { micOn: true, camOn: true };
  };

  // Get participant name by ID
  const getParticipantName = (participantId) => {
    const participant = participants.find(
      (p) => String(p.id) === String(participantId)
    );
    return participant?.name || `User ${participantId}`;
  };

  const handleVideoError = (error) => {
    console.error("Video error:", error);
  };

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  return (
    <MeetingLayout
      meetingId={meetingId}
      userId={user?.id}
      userRole={user?.role || "participant"}
      socket={wsConn}
      disableAutoConnect
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

        {/* Content */}
        <main className="pd-main">
          <section className="prt-wrap">
            {/* Connection Status */}
            <div
              className="connection-status"
              style={{
                marginBottom: 16,
                padding: 12,
                background: "#f3f4f6",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 14,
                }}
              >
                <div
                  className={`status-indicator ${
                    wsConn ? "connected" : "disconnected"
                  }`}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: wsConn ? "#10b981" : "#ef4444",
                  }}
                />
                <span>WebSocket: {wsConn ? "Connected" : "Disconnected"}</span>
                <span style={{ marginLeft: 16 }}>
                  Connected Peers: {connectedPeers.length}
                </span>
                <span style={{ marginLeft: 16 }}>
                  Remote Streams: {remoteStreams.length}
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div
              className="prt-tabs"
              style={{ display: "flex", gap: 8, marginBottom: 12 }}
            >
              <button
                className={`prt-tab ${activeTab === "video" ? "active" : ""}`}
                onClick={() => setActiveTab("video")}
              >
                <Icon slug="camera" />{" "}
                <span style={{ marginLeft: 6 }}>
                  Video ({remoteStreams.length + (localStream ? 1 : 0)})
                </span>
              </button>
              <button
                className={`prt-tab ${activeTab === "list" ? "active" : ""}`}
                onClick={() => setActiveTab("list")}
              >
                <Icon slug="users" />{" "}
                <span style={{ marginLeft: 6 }}>
                  List ({participants.length})
                </span>
              </button>
            </div>

            {/* Tab: VIDEO */}
            {activeTab === "video" && (
              <>
                <div
                  className="video-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
                    gap: "16px",
                    marginBottom: "16px",
                  }}
                >
                  {/* Local Video */}
                  {localStream && (
                    <VideoTile
                      label="You"
                      stream={localStream}
                      muted={true}
                      micOn={micOn}
                      camOn={camOn}
                      onVideoError={handleVideoError}
                      className={!camOn ? "camera-off" : ""}
                    />
                  )}

                  {/* Remote Videos */}
                  {remoteStreams.map(({ peerId, stream }) => {
                    const mediaState = getParticipantMediaState(peerId);
                    return (
                      <VideoTile
                        key={peerId}
                        label={getParticipantName(peerId)}
                        stream={stream}
                        muted={false}
                        micOn={mediaState.micOn}
                        camOn={mediaState.camOn}
                        onVideoError={handleVideoError}
                        className={!mediaState.camOn ? "camera-off" : ""}
                      />
                    );
                  })}
                </div>

                {/* Status Messages */}
                {!localStream && (
                  <div
                    className="pd-empty"
                    style={{
                      marginBottom: 16,
                      padding: 16,
                      background: "#fef3c7",
                      borderRadius: 8,
                      color: "#92400e",
                    }}
                  >
                    Mengambil akses kamera dan mikrofon...
                  </div>
                )}

                {localStream && remoteStreams.length === 0 && (
                  <div
                    className="pd-empty"
                    style={{
                      padding: 16,
                      background: "#f3f4f6",
                      borderRadius: 8,
                      color: "#6b7280",
                    }}
                  >
                    Menunggu peserta lain bergabung atau mengaktifkan kamera
                    mereka...
                    <br />
                    <small>
                      Pastikan peserta lain telah memberikan izin kamera dan
                      mikrofon.
                    </small>
                  </div>
                )}

                {/* Debug Info (only in development) */}
                {process.env.NODE_ENV === "development" && (
                  <details
                    style={{
                      marginTop: 16,
                      padding: 12,
                      background: "#f9fafb",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#6b7280",
                    }}
                  >
                    <summary>Debug Info</summary>
                    <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(
                        {
                          localStream: localStream
                            ? {
                                id: localStream.id,
                                tracks: localStream
                                  .getTracks()
                                  .map((t) => ({
                                    kind: t.kind,
                                    enabled: t.enabled,
                                  })),
                              }
                            : null,
                          remoteStreams: remoteStreams.map((rs) => ({
                            peerId: rs.peerId,
                            streamId: rs.stream.id,
                            tracks: rs.stream
                              .getTracks()
                              .map((t) => ({
                                kind: t.kind,
                                enabled: t.enabled,
                              })),
                          })),
                          participantMediaStates: Object.fromEntries(
                            participantMediaStates
                          ),
                          connectedPeers,
                          wsConnected: !!wsConn,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </details>
                )}
              </>
            )}

            {/* Tab: LIST */}
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
                    {filtered.map((p) => {
                      const mediaState = getParticipantMediaState(p.id);
                      return (
                        <div key={p.id} className="prt-item">
                          <div className="prt-avatar">
                            {(p.name || "?").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="prt-info">
                            <div className="prt-name">{p.name}</div>
                            <div className="prt-meta">
                              <span className="prt-role">{p.role}</span>
                              {p.seat && <span className="prt-sep">•</span>}
                              {p.seat && (
                                <span className="prt-seat">Seat {p.seat}</span>
                              )}
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
                              className={`prt-pill ${
                                mediaState.micOn ? "on" : "off"
                              }`}
                              onClick={() =>
                                handleMicToggle(p.id, mediaState.micOn)
                              }
                              title={
                                mediaState.micOn
                                  ? "Mic On - Click to turn off"
                                  : "Mic Off - Click to turn on"
                              }
                            >
                              <Icon slug="mic" />
                            </button>
                            <button
                              className={`prt-pill ${
                                mediaState.camOn ? "on" : "off"
                              }`}
                              onClick={() =>
                                handleCameraToggle(p.id, mediaState.camOn)
                              }
                              title={
                                mediaState.camOn
                                  ? "Camera On - Click to turn off"
                                  : "Camera Off - Click to turn on"
                              }
                            >
                              <Icon slug="camera" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
          </section>
        </main>

        {!loadingMenus && !errMenus && (
          <BottomNav
            items={visibleMenus}
            active="participants"
            onSelect={handleSelectNav}
          />
        )}

        <MeetingFooter
          userRole={user?.role || "participant"}
          micOn={micOn}
          camOn={camOn}
          onToggleMic={toggleMic}
          onToggleCam={toggleCam}
        />
      </div>
    </MeetingLayout>
  );
}
