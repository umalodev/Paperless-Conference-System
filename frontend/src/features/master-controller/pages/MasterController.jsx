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

  // ✅ Socket hook
  const { user, participants, mirrorFrames, sendCommand, fetchParticipants, latency, waitForMirrorStopped } = useControlSocket({ notify, confirm });


  // === Search & Menu Hooks ===
  const { query, setQuery, filteredParticipants } =
    useParticipants(participants);
  const { visibleMenus, loadingMenus, errMenus } = useUserMenus();

  // === Local states ===
  const [activeMirrorId, setActiveMirrorId] = useState(null);
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [fullscreenId, setFullscreenId] = useState(null);

  // ✅ Prevent multiple mirrors
// ✅ Prevent multiple mirrors (with switch confirmation)
// ✅ Only one mirror allowed — no auto-switch, show info if already active
const handleSendCommand = async (targetId, action) => {
  console.log("🧠 handleSendCommand triggered:", { targetId, action, activeMirrorId });

  // === START MIRROR ===
  if (action === "mirror-start") {
    // 1️⃣ No active mirror → start normally
    if (!activeMirrorId) {
      setActiveMirrorId(targetId);
      sendCommand(targetId, "mirror-start");
      return;
    }

    // 2️⃣ Mirror already active for the same user → just ignore
    if (activeMirrorId === targetId) {
      notify({
        variant: "info",
        title: "Mirror Already Active",
        message: "This participant is already being mirrored.",
        autoCloseMs: 2000,
      });
      return;
    }

    // 3️⃣ Mirror active for another participant → block and show info
    notify({
      variant: "warning",
      title: "Mirror In Use",
      message:
        "Mirror is currently active on another device. Please stop it first before starting a new one.",
      autoCloseMs: 3000,
    });
    return;
  }

  // === STOP MIRROR ===
  if (action === "mirror-stop") {
    setActiveMirrorId(null);
    sendCommand(targetId, "mirror-stop");
    return;
  }

  // === Other commands ===
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