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
import { useMediaRoom } from "../../../../contexts/MediaRoomContext.jsx";
import { useModal } from "../../../../contexts/ModalProvider.jsx";
import MeetingFooter from "../../../../components/MeetingFooter.jsx";
import MeetingLayout from "../../../../components/MeetingLayout.jsx";
import BottomNav from "../../../../components/BottomNav.jsx";
import Icon from "../../../../components/Icon.jsx";

import {
  MaterialCard,
  HistoryGroup,
  SkeletonGrid,
  SkeletonAccordion,
} from "../components";

import { useMaterials, useMaterialsHistory, useMaterialBadge } from "../hooks";

import { formatMeta, extKind } from "../utils";
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

  const { historyGroups, loadingHistory, errHistory, reloadHistory } =
    useMaterialsHistory({ meetingId });

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

  // ===== MENUS =====
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingMenus(true);
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
              seq: m.sequenceMenu,
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

  const visibleMenus = useMemo(
    () =>
      (menus || [])
        .filter((m) => (m?.flag ?? "Y") === "Y")
        .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999)),
    [menus]
  );
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
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <h1 className="pd-title">
              {localStorage.getItem("currentMeeting")
                ? JSON.parse(localStorage.getItem("currentMeeting"))?.title ||
                  "Meeting Default"
                : "Default"}
            </h1>
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
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="pd-user-name">
                  {displayName || "Participant"}
                </div>
                <div className="pd-user-role">{user?.role}</div>
              </div>
            </div>
          </div>
        </header>

        {/* ===== CONTENT ===== */}
        <main className="pd-main">
          <section className="mtl-wrap">
            <div className="mtl-header">
              <div className="mtl-title">
                <img
                  src="/img/Materials1.png"
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
                  <Icon iconUrl="/img/history.png" size={18} />
                  <span>{showHistory ? "Close History" : "History"}</span>
                </button>

                <button
                  className="mtl-btn ghost"
                  onClick={loadMaterials}
                  title="Refresh"
                >
                  <Icon iconUrl="/img/refresh.png" size={18} />
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
                          <HistoryGroup
                            key={group.meetingId}
                            group={group}
                            onPreview={(it) =>
                              window.open(
                                it.url,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                            onDownload={(it) => {
                              const a = document.createElement("a");
                              a.href = it.url;
                              a.download = it.name;
                              a.click();
                            }}
                          />
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
