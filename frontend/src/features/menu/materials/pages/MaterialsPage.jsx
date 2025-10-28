// src/features/menu/materials/pages/MaterialsPage.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";
import useMeetingGuard from "../../../../hooks/useMeetingGuard.js";
import useMeetingMenus from "../../../../hooks/useMeetingMenus.js"; // ✅ gunakan global hook menu
import { useMediaRoom } from "../../../../contexts/MediaRoomContext.jsx";
import { useModal } from "../../../../contexts/ModalProvider.jsx";
import MeetingFooter from "../../../../components/MeetingFooter.jsx";
import MeetingLayout from "../../../../components/MeetingLayout.jsx";
import BottomNav from "../../../../components/BottomNav.jsx";
import Icon from "../../../../components/Icon.jsx";
import MeetingHeader from "../../../../components/MeetingHeader.jsx";
import HistoryAccordion from "../../../../components/HistoryAccordion.jsx";

import {
  MaterialCard,
  HistoryGroup,
  SkeletonGrid,
  SkeletonAccordion,
} from "../components";

import { useMaterials, useMaterialsHistory, useMaterialBadge } from "../hooks";
import { formatMeta, extKind } from "../utils";
import { formatTime } from "../../../../utils/format.js";
import "../styles/materials.css";

export default function MaterialsPage() {
  const navigate = useNavigate();
  const { notify, confirm } = useModal();

  // ===== USER =====
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    const dn = localStorage.getItem("pconf.displayName") || "";
    setDisplayName(dn);
  }, []);

  const isHost = /^(host|admin)$/i.test(user?.role || "");

  // ===== MEDIA ROOM =====
  const {
    ready: mediaReady,
    micOn,
    camOn,
    startMic,
    stopMic,
    startCam,
    stopCam,
  } = useMediaRoom();

  const onToggleMic = useCallback(() => {
    if (!mediaReady) return;
    micOn ? stopMic() : startMic();
  }, [mediaReady, micOn, startMic, stopMic]);

  const onToggleCam = useCallback(() => {
    if (!mediaReady) return;
    camOn ? stopCam() : startCam();
  }, [mediaReady, camOn, startCam, stopCam]);

  // ===== MEETING ID =====
  const meetingId = useMemo(() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || cm?.code || null;
    } catch {
      return null;
    }
  }, []);

  // ===== HOOKS =====
  const {
    items,
    loadingItems,
    errItems,
    uploading,
    loadMaterials,
    uploadFiles,
    deleteMaterial,
  } = useMaterials({ meetingId, notify, confirm });

  const { historyGroups, loadingHistory, errHistory } = useMaterialsHistory({
    meetingId,
  });

  const { showHistory, toggleHistory, markAllRead, setBadgeLocal } =
    useMaterialBadge({ meetingId });

  // ===== FILE INPUT =====
  const fileRef = useRef(null);
  const onClickUpload = () => fileRef.current?.click();
  const onFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    await uploadFiles(files);
    e.target.value = "";
  };

  // ✅ GUNAKAN GLOBAL HOOK MENU
  const { visibleMenus, errMenus, loadingMenus } = useMeetingMenus();
  const handleSelect = (item) => navigate(`/menu/${item.slug}`);

  // ===== GUARD =====
  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  // ===== BADGE EFFECT =====
  useEffect(() => {
    if (!meetingId) return;
    (async () => {
      try {
        await loadMaterials();
        await markAllRead();
        setBadgeLocal("materials", 0);
      } catch (err) {
        console.error("Load materials failed:", err);
      }
    })();
  }, [meetingId, loadMaterials, markAllRead, setBadgeLocal]);

  // ===== RENDER =====
  return (
    <MeetingLayout
      meetingId={meetingId}
      userId={user?.id}
      userRole={user?.role || "participant"}
      socket={null}
      mediasoupDevice={null}
      meetingTitle={(() => {
        try {
          const raw = localStorage.getItem("currentMeeting");
          const cm = raw ? JSON.parse(raw) : null;
          return cm?.title || `Meeting #${meetingId}`;
        } catch {
          return `Meeting #${meetingId}`;
        }
      })()}
    >
      <div className="pd-app materials-page">
        {/* ===== HEADER ===== */}
        <MeetingHeader displayName={displayName} user={user} />

        {/* ===== CONTENT ===== */}
        <main className="pd-main">
          <section className="mtl-wrap">
            <div className="mtl-header">
              <div className="mtl-title">
                <img
                  src="img/Materials1.png"
                  alt=""
                  className="mtl-title-icon"
                />
                <span className="mtl-title-text">Materials</span>
              </div>

              {/* ACTION BUTTONS */}
              <div className="mtl-actions">
                {isHost && (
                  <button
                    className="mtl-btn"
                    onClick={onClickUpload}
                    disabled={!meetingId || uploading}
                    title="Upload material"
                  >
                    <Icon slug="upload" />
                    <span>{uploading ? "Uploading…" : "Upload"}</span>
                  </button>
                )}

                <button
                  className={`mtl-btn ${showHistory ? "active" : ""}`}
                  onClick={toggleHistory}
                  title="Materials History"
                >
                  <Icon iconUrl="img/history.png" size={18} />
                  <span>{showHistory ? "Close History" : "History"}</span>
                </button>

                <button
                  className="mtl-btn ghost"
                  onClick={loadMaterials}
                  title="Refresh"
                >
                  <Icon iconUrl="img/refresh.png" size={18} />
                  <span>Refresh</span>
                </button>

                {isHost && (
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    style={{ display: "none" }}
                    onChange={onFilesSelected}
                  />
                )}
              </div>
            </div>

            {/* CURRENT MATERIALS */}
            {loadingItems && <SkeletonGrid />}
            {errItems && !loadingItems && (
              <div className="pd-error">
                Failed to load materials: {errItems}
              </div>
            )}
            {!loadingItems && !errItems && items.length === 0 && (
              <div className="pd-empty">No materials yet</div>
            )}
            {!loadingItems && !errItems && items.length > 0 && (
              <div className="mtl-grid">
                {items.map((it) => (
                  <MaterialCard
                    key={it.id}
                    name={it.name}
                    meta={formatMeta(it)}
                    ext={extKind(it.name)}
                    onPreview={() =>
                      window.open(it.url, "_blank", "noopener,noreferrer")
                    }
                    onDownload={() => {
                      const a = document.createElement("a");
                      a.href = it.url;
                      a.download = it.name;
                      a.click();
                    }}
                    onDelete={isHost ? () => deleteMaterial(it) : null}
                    canDelete={isHost}
                  />
                ))}
              </div>
            )}

            {/* HISTORY SECTION */}
            {showHistory && (
              <>
                <div className="mtl-divider" />
                <section className="mtl-history">
                  <h3 className="mtl-history-title">
                    <Icon slug="history" /> Materials History
                    <span className="mtl-chip ghost">
                      {historyGroups.length} meeting
                    </span>
                  </h3>

                  {loadingHistory && <SkeletonAccordion />}
                  {errHistory && !loadingHistory && (
                    <div className="pd-error">
                      Failed to load history: {errHistory}
                    </div>
                  )}
                  {!loadingHistory &&
                    !errHistory &&
                    historyGroups.length === 0 && (
                      <div className="pd-empty">
                        Belum ada riwayat materials.
                      </div>
                    )}
                  {!loadingHistory &&
                    !errHistory &&
                    historyGroups.length > 0 && (
                      <div className="mtl-accordion">
                        {historyGroups.map((group) => (
                          <HistoryAccordion
                            key={group.meetingId}
                            title={group.title || `Meeting #${group.meetingId}`}
                            status={group.status}
                            startTime={group.startTime}
                            endTime={group.endTime}
                            count={group.materials?.length || 0}
                            classPrefix="mtl"
                            emptyText="No materials available."
                          >
                            <div className="mtl-grid">
                              {(group.materials || []).map((it) => (
                                <MaterialCard
                                  key={it.id}
                                  name={it.name}
                                  meta={formatMeta(it)}
                                  ext={extKind(it.name)}
                                  onPreview={() =>
                                    window.open(
                                      it.url,
                                      "_blank",
                                      "noopener,noreferrer"
                                    )
                                  }
                                  onDownload={() => {
                                    const a = document.createElement("a");
                                    a.href = it.url;
                                    a.download = it.name;
                                    a.click();
                                  }}
                                />
                              ))}
                            </div>
                          </HistoryAccordion>
                        ))}
                      </div>
                    )}
                </section>
              </>
            )}

            {errMenus && (
              <div className="pd-error" style={{ marginTop: 12 }}>
                Failed to load menu: {errMenus}
              </div>
            )}
          </section>
        </main>

        {/* ===== FOOTER ===== */}
        {!loadingMenus && !errMenus && (
          <BottomNav
            items={visibleMenus}
            active="materials"
            onSelect={handleSelect}
          />
        )}

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
