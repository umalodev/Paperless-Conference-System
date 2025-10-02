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
              menuId: m.menuId,
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
        if (!meetingId) return;
        setLoadingList(true);
        setErrList("");

        const qs = `?meetingId=${encodeURIComponent(meetingId)}`;
        let res = await fetch(`${API_URL}/api/participants/list${qs}`, {
          headers: {
            "Content-Type": "application/json",
            ...(meetingService.getAuthHeaders?.() || {}),
          },
          credentials: "include",
        });

        // fallback dev-only
        if (!res.ok) {
          res = await fetch(`${API_URL}/api/participants/test-data`, {
            headers: { "Content-Type": "application/json" },
          });
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();

        if (!cancel) {
          if (json.success) {
            const raw = Array.isArray(json.data) ? json.data : [];

            // normalisasi: pastikan ada displayName
            const fresh = raw.map((p) => ({
              ...p,
              id: p.id ?? p.participantId ?? p.userId, // jaga2
              displayName:
                p.displayName || p.name || p.username || "Participant",
              mic: p.mic ?? !!p.isAudioEnabled,
              cam: p.cam ?? !!p.isVideoEnabled,
            }));

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
        (p.displayName || "").toLowerCase().includes(q) ||
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

  // Peta nama berdasarkan participantId & userId dari data DB
  const nameByParticipantId = useMemo(() => {
    const m = new Map();
    participants.forEach((p) => m.set(String(p.id), p.displayName));
    return m;
  }, [participants]);

  const nameByUserId = useMemo(() => {
    const m = new Map();
    participants.forEach((p) => m.set(String(p.userId), p.displayName));
    return m;
  }, [participants]);

  // (Opsional) Peta nama dari metadata remotePeers jika ada
  const nameByPeerId = useMemo(() => {
    const m = new Map();
    remotePeers.forEach((obj, pid) => {
      const metaName =
        obj.displayName ||
        obj?.meta?.displayName ||
        obj?.metadata?.displayName ||
        null;
      if (metaName) m.set(String(pid), metaName);
    });
    return m;
  }, [remotePeers]);

  // Fallback tambahan: kalau peerId == userId
  const nameByPidAsUserId = useMemo(() => {
    const m = new Map();
    participants.forEach((p) => m.set(String(p.userId), p.displayName));
    return m;
  }, [participants]);

  // Helper: deep scan metadata peer utk ambil displayName/participantId/userId
  const extractPeerMeta = useCallback((obj) => {
    if (!obj || typeof obj !== "object") return {};
    const seen = new Set();
    const stack = [obj];
    let displayName, participantId, userId;
    let hops = 0;

    const isIdLike = (x) =>
      ["string", "number"].includes(typeof x) && String(x).length > 0;

    while (stack.length && hops < 200) {
      const cur = stack.pop();
      hops++;
      if (!cur || typeof cur !== "object" || seen.has(cur)) continue;
      seen.add(cur);

      for (const [k, v] of Object.entries(cur)) {
        const key = String(k).toLowerCase();

        if (
          !displayName &&
          key.includes("displayname") &&
          typeof v === "string"
        ) {
          displayName = v.trim();
        }
        if (
          !participantId &&
          key.includes("participant") &&
          key.includes("id") &&
          isIdLike(v)
        ) {
          participantId = v;
        }
        if (
          !userId &&
          (key === "userid" || key.endsWith(".userid")) &&
          isIdLike(v)
        ) {
          userId = v;
        }

        if (v && typeof v === "object") stack.push(v);
      }
    }
    return { displayName, participantId, userId };
  }, []);

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

  const displayName = useMemo(() => {
    const byMeeting = meetingId
      ? localStorage.getItem(`meeting:${meetingId}:displayName`)
      : null;
    return (
      (byMeeting && byMeeting.trim()) ||
      (localStorage.getItem("pconf.displayName") || "").trim() ||
      user?.username ||
      "Participant"
    );
  }, [meetingId, user]);

  // Sinkronkan displayName ke server (tidak mengganggu UI)
  useEffect(() => {
    if (!meetingId) return;

    const byMeeting = localStorage.getItem(`meeting:${meetingId}:displayName`);
    const globalName = localStorage.getItem("pconf.displayName");
    const name = (byMeeting || globalName || "").trim();
    if (!name) return;

    meetingService
      .setParticipantDisplayName({ meetingId, displayName: name })
      .catch(() => {});
  }, [meetingId]);

  return (
    <MeetingLayout
      meetingId={meetingId}
      userId={user?.id}
      userRole={user?.role || "participant"}
      socket={null}
      mediasoupDevice={null}
    >
      <div className="pd-app">
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
                {(displayName || "US").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="pd-user-name">{displayName}</div>
                <div className="pd-user-role">
                  {user?.role || "Participant"}
                </div>
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

            {/* CONTENT: LIST */}
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
                            {(p.displayName || "??").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="prt-info">
                            <div className="prt-name">{p.displayName}</div>
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
                                  live.mic ? stopMic() : startMic();
                                } else {
                                  updateParticipantStatus(p.id, {
                                    mic: !live.mic,
                                  });
                                }
                              }}
                            >
                              <Icon slug="mic" />
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
                              <Icon slug="camera" />
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
                      name={displayName + (camOn ? "" : " (camera off)")}
                      stream={localStream}
                      placeholder={!camOn}
                      localPreview={camOn}
                    />

                    {/* Remote peers */}
                    {Array.from(remotePeers.entries()).map(([pid, obj]) => {
                      const peerId = String(pid);

                      // 1) deep-scan metadata peer
                      const {
                        displayName: metaName,
                        participantId: metaPid,
                        userId: metaUid,
                      } = extractPeerMeta(obj);

                      // 2) ambil dari peta2 yang ada
                      const byPeerId = nameByPeerId.get(peerId);
                      const byParticipant =
                        (metaPid && nameByParticipantId.get(String(metaPid))) ||
                        nameByParticipantId.get(peerId); // jaga2 pid==participantId

                      const byUser =
                        (metaUid && nameByUserId.get(String(metaUid))) ||
                        nameByUserId.get(peerId); // jaga2 pid==userId

                      // 3) fallback tambahan: peerId == userId
                      const byPidAsUser = nameByPidAsUserId.get(peerId);

                      const name =
                        metaName ||
                        byParticipant ||
                        byUser ||
                        byPeerId ||
                        byPidAsUser ||
                        `User ${peerId.slice(-4)}`;

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
