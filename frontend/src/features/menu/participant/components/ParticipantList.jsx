// src/features/menu/participants/components/ParticipantList.jsx
import React from "react";
import ParticipantItem from "./ParticipantItem.jsx";
import ParticipantSummary from "./ParticipantSummary.jsx";
import Icon from "../../../../components/Icon.jsx";

export default function ParticipantList({
  participants,
  filtered,
  liveFlagsFor,
  query,
  setQuery,
  totals,
  user,
  muteAllOthers,
  reloadParticipants,
  loadingList,
  errList,
  myPeerId,
  stopMic,
  startMic,
  stopCam,
  startCam,
  updateParticipantStatus,
}) {
  return (
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
          <button className="prt-btn" onClick={reloadParticipants}>
            <img src="img/refresh.png" alt="Refresh" className="mute-img" />
            <span className="prt-btn-label">Refresh</span>
          </button>
          {(user?.role === "host" || user?.role === "Host") && (
            <button
              className="prt-btn danger"
              onClick={async () => {
                const res = await muteAllOthers();
                if (!res?.ok) console.warn("mute-all failed:", res?.error);
              }}
            >
              <img src="img/mute.png" alt="Mute" className="mute-img" />
              <span className="prt-btn-label">Mute all</span>
            </button>
          )}
        </div>
      </div>

      <ParticipantSummary totals={totals} />

      {loadingList && <div className="pd-empty">Loading participants…</div>}
      {errList && !loadingList && (
        <div className="pd-error">Gagal memuat peserta: {errList}</div>
      )}

      {!loadingList && !errList && (
        <div className="prt-grid">
          {filtered.map((p) => (
            <ParticipantItem
              key={p.id}
              participant={p}
              live={liveFlagsFor(p)}
              myPeerId={myPeerId}
              stopMic={stopMic}
              startMic={startMic}
              stopCam={stopCam}
              startCam={startCam}
              updateParticipantStatus={updateParticipantStatus}
            />
          ))}

          {filtered.length === 0 && participants.length === 0 && (
            <div className="pd-empty" style={{ gridColumn: "1 / -1" }}>
              Tidak ada peserta dalam meeting.
            </div>
          )}
          {filtered.length === 0 && participants.length > 0 && (
            <div className="pd-empty" style={{ gridColumn: "1 / -1" }}>
              No participant found
            </div>
          )}
        </div>
      )}
    </>
  );
}
