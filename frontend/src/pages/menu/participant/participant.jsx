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
import { useMediaRoom } from "../../../contexts/MediaRoomContext.jsx";

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
    muteAllOthers,
    myPeerId,
  } = useMediaRoom();
  const liveFlagsFor = useLiveFlags(
    remotePeers,
    String(myPeerId),
    micOn,
    camOn
  );

  const totals = useMemo(() => {
    const total = participants.length;
    const liveMic =
      (micOn ? 1 : 0) +
      Array.from(remotePeers.values()).filter((v) => v.audioActive).length;
    const liveCam =
      (camOn ? 1 : 0) +
      Array.from(remotePeers.values()).filter((v) => v.videoActive).length;
    return { total, micOn: liveMic, camOn: liveCam };
  }, [participants.length, remotePeers, micOn, camOn]);
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
              <h1 className="pd-title">{localStorage.getItem("currentMeeting") ? JSON.parse(localStorage.getItem("currentMeeting"))?.title || "Meeting Default" : "Default"}</h1>
              <div className="pd-sub">Participant</div>
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
                  <div className="prt-title">
                  </div>
                  <div className="prt-search">
                    <span className="prt-search-icon">
                      <Icon slug="search" />
                    </span>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search name, or role.."
                      aria-label="Search participants"
                    />
                  </div>
                  <div className="prt-actions">
                    {(user?.role === "host" || user?.role === "Host") && (
                      <button
                        className="prt-btn danger"
                        title="Mute all microphones"
                        onClick={async () => {
                          const res = await muteAllOthers();
                          if (!res?.ok) {
                            console.warn("mute-all failed:", res?.error);
                          }
                        }}
                      >
                        {/* Hapus baris di bawah ini untuk menghilangkan kotak */}
                        {/* <Icon slug="mic-off" /> */}

                        {/* Gunakan hanya gambar yang sudah kamu tambahkan */}
                        <img
                          src="/img/mute.png"
                          alt="Mute icon"
                          className="mute-img"
                          aria-hidden="true"
                        />
                        <span className="prt-btn-label">Mute all</span>
                      </button>
                    )}
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
                      const live = liveFlagsFor(p);
                      return (
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
                              className={`prt-pill ${live.mic ? "on" : "off"}`}
                              title={
                                p.mic
                                  ? "Mic On - Click to turn off"
                                  : "Mic Off - Click to turn on"
                              }
                              onClick={() => {
                                if (String(p.id) === String(myPeerId)) {
                                  // kontrol mic sendiri biar sinkron dengan mediasoup
                                  live.mic ? stopMic() : startMic();
                                } else {
                                  // opsional: tetap update DB kalau butuh
                                  updateParticipantStatus(p.id, {
                                    mic: !live.mic,
                                  });
                                }
                              }}
                            >
                              {live.mic ? (
                                <Icon
                                  slug="mic"
                                  style={{
                                    color: "#4CAF50",
                                    fontSize: "18px",
                                    filter:
                                      "drop-shadow(0 0 2px rgba(76, 175, 80, 0.5))",
                                  }}
                                />
                              ) : (
                                <img
                                  src="/img/mute.png"
                                  alt="Mic Off"
                                  style={{ width: "16px", height: "16px" }}
                                />
                              )}
                            </button>
                            <button
                              className={`prt-pill ${live.cam ? "on" : "off"}`}
                              title={
                                p.cam
                                  ? "Camera On - Click to turn off"
                                  : "Camera Off - Click to turn on"
                              }
                              onClick={() => {
                                if (String(p.id) === String(myPeerId)) {
                                  live.cam ? stopCam() : startCam();
                                } else {
                                  updateParticipantStatus(p.id, {
                                    cam: !live.cam,
                                  });
                                }
                              }}
                            >
                              {live.cam ? (
                                <Icon
                                  slug="camera"
                                  style={{
                                    color: "#4CAF50",
                                    fontSize: "18px",
                                    filter:
                                      "drop-shadow(0 0 2px rgba(76, 175, 80, 0.5))",
                                  }}
                                />
                              ) : (
                                <img
                                  src="/img/offcam.png"
                                  alt="Camera Off"
                                  style={{ width: "16px", height: "16px" }}
                                />
                              )}
                            </button>
                          </div>
                          <div className="prt-actions-right"></div>
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

      <AudioSink stream={stream} muted={true} />
      <div className="video-name">{name}</div>
    </div>
  );
}

function AudioSink({ stream, muted, hideButton = false, unlockedSignal }) {
  const ref = useRef(null);
  const [needUnlock, setNeedUnlock] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // hanya attach kalau ada audio track
    const hasAudio = !!stream && stream.getAudioTracks().length > 0;
    el.srcObject = hasAudio ? stream : null;

    if (hasAudio && !muted) {
      el.play()
        .then(() => setNeedUnlock(false))
        .catch(() => setNeedUnlock(true));
    }
  }, [stream, muted, unlockedSignal]);

  const unlock = () => {
    const el = ref.current;
    el?.play()
      ?.then(() => setNeedUnlock(false))
      .catch(() => {});
  };

  return (
    <>
      {!muted && needUnlock && !hideButton && (
        <button className="pd-audio-unlock" onClick={unlock}>
          Enable audio
        </button>
      )}
      {/* hidden audio sink */}
      <audio
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        style={{ display: "none" }}
      />
    </>
  );
}

function useLiveFlags(remotePeers, myPeerId, micOn, camOn) {
  return useCallback(
    (participant) => {
      const pid = String(participant.id);
      if (pid === String(myPeerId)) {
        return { mic: !!micOn, cam: !!camOn };
      }
      const r = remotePeers.get(pid);
      return {
        mic: r?.audioActive ?? false,
        cam: r?.videoActive ?? false,
      };
    },
    [remotePeers, myPeerId, micOn, camOn]
  );
}
