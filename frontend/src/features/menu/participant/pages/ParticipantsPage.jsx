// src/features/menu/participants/pages/ParticipantsPage.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import "../styles/participant.css";
import { API_URL } from "../../../../config.js";
import { useNavigate } from "react-router-dom";
import meetingService from "../../../../services/meetingService.js";
import meetingSocketService from "../../../../services/meetingSocketService.js";
import { useMediaRoom } from "../../../../contexts/MediaRoomContext.jsx";
import useMeetingGuard from "../../../../hooks/useMeetingGuard.js";
import Icon from "../../../../components/Icon.jsx"; // ✅ tambahkan ini untuk ikon refresh

// Layout & Components
import ParticipantsLayout from "../layouts/ParticipantsLayout.jsx";
import {
  ParticipantTabs,
  ParticipantList,
  VideoGrid,
} from "../components";

// Utils
import { extractPeerMeta, formatTotals } from "../utils";
import useLiveFlags from "../hooks/useLiveFlags.js";

export default function ParticipantsPage() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");

  const [participants, setParticipants] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [errList, setErrList] = useState("");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("list");

  // ✅ Tambahkan state untuk refresh video
  const [videoRefreshKey, setVideoRefreshKey] = useState(0);
  const [refreshingVideo, setRefreshingVideo] = useState(false);

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

  // Who am I
  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    const dn = localStorage.getItem("pconf.displayName");
    if (dn) setDisplayName(dn);
  }, []);

  // ===== Load Bottom Nav Menus =====
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingMenus(true);
        const res = await fetch(`${API_URL}/api/menu/user/menus`, {
          headers: meetingService.getAuthHeaders(),
        });
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
    return () => (cancel = true);
  }, []);

  // ===== Participants: socket + list =====
  useEffect(() => {
    if (!meetingId) return;
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = userData?.id;

    meetingSocketService.connect(meetingId, userId, API_URL);

    const loadInitial = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/participants/list?meetingId=${meetingId}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(meetingService.getAuthHeaders?.() || {}),
            },
          }
        );
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const formatted = json.data.map((p) => ({
            id: String(p.participantId ?? p.userId ?? p.id),
            displayName: p.displayName || p.name || "Participant",
            mic: !!p.isAudioEnabled,
            cam: !!p.isVideoEnabled,
            role: p.role || "participant",
          }));
          setParticipants(formatted);
        }
      } catch (err) {
        console.error("❌ Failed to load participants:", err);
      }
    };
    loadInitial();

    // Socket listeners
    const handleJoin = (data) => {
      const id = String(data.participantId ?? data.userId);
      const name = data.displayName || "Participant";
      setParticipants((prev) => {
        const idx = prev.findIndex((p) => String(p.id) === id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], displayName: name };
          return updated;
        }
        return [
          ...prev,
          { id, displayName: name, mic: false, cam: false, role: "participant" },
        ];
      });
    };

    const handleLeave = (data) => {
      const id = String(data.participantId ?? data.userId);
      setParticipants((prev) => prev.filter((p) => String(p.id) !== id));
    };

    const handleUpdate = (data) => {
      setParticipants((prev) =>
        prev.map((p) =>
          String(p.id) === String(data.participantId ?? data.userId)
            ? { ...p, ...data.updates }
            : p
        )
      );
    };

    meetingSocketService.on("participant_joined", handleJoin);
    meetingSocketService.on("participant_left", handleLeave);
    meetingSocketService.on("participant_updated", handleUpdate);

    return () => {
      meetingSocketService.off("participant_joined", handleJoin);
      meetingSocketService.off("participant_left", handleLeave);
      meetingSocketService.off("participant_updated", handleUpdate);
    };
  }, [meetingId]);

  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  // ====== Mediasoup & Controls ======
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
  const totals = useMemo(
    () => formatTotals(participants, remotePeers, micOn, camOn),
    [participants.length, remotePeers, micOn, camOn]
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

  const visibleMenus = useMemo(
    () => menus.filter((m) => m.flag === "Y"),
    [menus]
  );

  const reloadParticipants = useCallback(async () => {
    if (!meetingId) return;
    try {
      setLoadingList(true);
      const res = await fetch(
        `${API_URL}/api/participants/list?meetingId=${meetingId}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(meetingService.getAuthHeaders?.() || {}),
          },
        }
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const formatted = json.data.map((p) => ({
          id: String(p.participantId ?? p.userId ?? p.id),
          displayName: p.displayName || p.name || "Participant",
          mic: !!p.isAudioEnabled,
          cam: !!p.isVideoEnabled,
          role: p.role || "participant",
        }));
        setParticipants(formatted);
      }
    } catch (e) {
      console.error("❌ Failed to reload participants:", e);
    } finally {
      setLoadingList(false);
    }
  }, [meetingId]);

  const updateParticipantStatus = async (participantId, updates) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/api/participants/${participantId}/status`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isAudioEnabled: updates.mic,
            isVideoEnabled: updates.cam,
          }),
        }
      );
      const json = await res.json();
      if (json.success) {
        setParticipants((prev) =>
          prev.map((p) => (p.id === participantId ? { ...p, ...updates } : p))
        );
      }
    } catch (e) {
      console.error("Error updating participant:", e);
    }
  };

  const onToggleMic = useCallback(
    () => (micOn ? stopMic() : startMic()),
    [micOn]
  );
  const onToggleCam = useCallback(
    () => (camOn ? stopCam() : startCam()),
    [camOn]
  );

  // ✅ Tombol khusus refresh video
  const handleRefreshVideo = () => {
    setRefreshingVideo(true);
    setVideoRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshingVideo(false), 700);
  };

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  return (
    <ParticipantsLayout
      meetingId={meetingId}
      user={user}
      displayName={displayName}
      meetingTitle={
        JSON.parse(localStorage.getItem("currentMeeting") || "{}")?.title ||
        "Default"
      }
      visibleMenus={visibleMenus}
      onSelectNav={handleSelectNav}
      micOn={micOn}
      camOn={camOn}
      onToggleMic={onToggleMic}
      onToggleCam={onToggleCam}
      loadingMenus={loadingMenus}
      errMenus={errMenus}
    >
      
    <ParticipantTabs
      activeTab={activeTab}
      onChange={setActiveTab}
      onRefreshVideo={handleRefreshVideo}
      refreshingVideo={refreshingVideo}
    />

      {activeTab === "list" ? (
        <ParticipantList
          participants={participants}
          filtered={filtered}
          query={query}
          setQuery={setQuery}
          loadingList={loadingList}
          errList={errList}
          totals={totals}
          liveFlagsFor={liveFlagsFor}
          user={user}
          myPeerId={myPeerId}
          startMic={startMic}
          stopMic={stopMic}
          startCam={startCam}
          stopCam={stopCam}
          muteAllOthers={muteAllOthers}
          reloadParticipants={reloadParticipants}
          updateParticipantStatus={updateParticipantStatus}
        />
      ) : (
        <VideoGrid
          key={videoRefreshKey} // 💥 Re-render hanya VideoGrid
          participants={participants}
          remotePeers={remotePeers}
          localStream={localStream}
          camOn={camOn}
          displayName={displayName}
          myPeerId={myPeerId}
          extractPeerMeta={extractPeerMeta}
          mediaReady={mediaReady}
          mediaError={mediaError}
        />
      )}
    </ParticipantsLayout>
  );
}
