import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import MeetingLayout from "../../../components/MeetingLayout.jsx";
import BottomNav from "../../../components/BottomNav.jsx";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import { useModal } from "../../../contexts/ModalProvider.jsx";

import useControlSocket from "../hooks/useControlSocket.js";
import useParticipants from "../hooks/useParticipants.js";
import useUserMenus from "../hooks/useUserMenus.js";

import Header from "../components/Header.jsx";
import ParticipantGrid from "../components/ParticipantGrid.jsx";
import MirrorFullscreen from "../components/MirrorFullscreen.jsx";
import InfoModal from "../components/InfoModal.jsx";

import "../styles/master-controller.css";

export default function MasterController() {
  const navigate = useNavigate();
  const { notify, confirm } = useModal();

  // ✅ Single instance of socket hook
  const {
    user,
    participants,
    mirrorFrames,
    sendCommand,
    fetchParticipants,
    latency,
  } = useControlSocket({ notify, confirm });

  // === Participant searching ===
  const { query, setQuery, filteredParticipants } =
    useParticipants(participants);

  // === Menus ===
  const { visibleMenus, loadingMenus, errMenus } = useUserMenus();

  const [activeMirrorId, setActiveMirrorId] = useState(null);
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [fullscreenId, setFullscreenId] = useState(null);

  // ✅ Ensure only one mirror is active
  const handleSendCommand = (targetId, action) => {
    if (action === "mirror-start") {
      if (activeMirrorId && activeMirrorId !== targetId) {
        notify({
          variant: "warning",
          title: "Mirror Already Active",
          message:
            "Only one participant can be mirrored at a time. Stop the current mirror first.",
        });
        return;
      }
      setActiveMirrorId(targetId);
    }

    if (action === "mirror-stop" && activeMirrorId === targetId) {
      setActiveMirrorId(null);
    }

    sendCommand(targetId, action);
  };

  return (
    <MeetingLayout
      disableMeetingSocket={true}
      meetingId={1000}
      userRole={user?.role || "admin"}
    >
      <div className="pd-app">
        {/* === Header === */}
        <Header latency={latency} onRefresh={fetchParticipants} />

        {/* === Main Section === */}
        <main className="pd-main">
          {participants.length === 0 ? (
            <div className="pd-empty">
              {latency === null
                ? "Connecting to control server..."
                : "No participants connected yet."}
            </div>
          ) : (
            <ParticipantGrid
              participants={filteredParticipants}
              totalCount={participants.length}
              mirrorFrames={mirrorFrames}
              sendCommand={handleSendCommand}
              setFullscreenId={setFullscreenId}
              setSelectedInfo={setSelectedInfo}
              activeMirrorId={activeMirrorId}
              query={query}
              setQuery={setQuery}
            />
          )}
        </main>

        {/* === Fullscreen Mirror === */}
        {fullscreenId && mirrorFrames[fullscreenId] && (
          <MirrorFullscreen
            participant={participants.find((x) => x.id === fullscreenId)}
            frame={mirrorFrames[fullscreenId]}
            onClose={() => setFullscreenId(null)}
          />
        )}

        {/* === Info Modal === */}
        {selectedInfo && (
          <InfoModal info={selectedInfo} onClose={() => setSelectedInfo(null)} />
        )}

        {/* === Bottom Navigation === */}
        {!loadingMenus && !errMenus && (
          <BottomNav
            items={visibleMenus}
            active="master-controller"
            onSelect={(item) => navigate(`/menu/${item.slug}`)}
          />
        )}

        {/* === Footer === */}
        <MeetingFooter userRole="admin" micOn={false} camOn={false} />
      </div>
    </MeetingLayout>
  );
}
