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
  const { notify } = useModal();

  // === Hooks utama (socket & data) ===
  const {
    user,
    participants,
    mirrorFrames,
    sendCommand,
    fetchParticipants,
    latency,
  } = useControlSocket(notify);

  // === Pencarian peserta ===
  const { query, setQuery, filteredParticipants } = useParticipants(participants);

  // === Ambil menu dari API ===
  const { visibleMenus, loadingMenus, errMenus } = useUserMenus();

  // === State tambahan UI ===
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [fullscreenId, setFullscreenId] = useState(null);

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
                ? "Menghubungkan ke server kontrol..."
                : "Belum ada peserta yang terhubung."}
            </div>
          ) : (
            <ParticipantGrid
              participants={filteredParticipants}
              totalCount={participants.length}
              mirrorFrames={mirrorFrames}
              sendCommand={sendCommand}
              setFullscreenId={setFullscreenId}
              setSelectedInfo={setSelectedInfo}
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
