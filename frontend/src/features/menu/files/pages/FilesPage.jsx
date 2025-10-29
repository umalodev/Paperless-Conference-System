// src/features/menu/files/pages/FilesPage.jsx
import React, { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../../../components/BottomNav.jsx";
import MeetingHeader from "../../../../components/MeetingHeader.jsx";
import MeetingFooter from "../../../../components/MeetingFooter.jsx";
import MeetingLayout from "../../../../components/MeetingLayout.jsx";
import HistoryAccordion from "../../../../components/HistoryAccordion.jsx";
import Icon from "../../../../components/Icon.jsx";
import "../styles/files.css";
import "../../../../components/history-accordion.css";
import { useMediaRoom } from "../../../../contexts/MediaRoomContext.jsx";
import { useModal } from "../../../../contexts/ModalProvider.jsx";
import useMeetingGuard from "../../../../hooks/useMeetingGuard.js";
import useMeetingInfo from "../../../../hooks/useMeetingInfo.js";
import useMeetingMenus from "../../../../hooks/useMeetingMenus.js";
import { useFiles, useFilesHistory, useFileBadge } from "../hooks";
import { FileCard, SkeletonGrid, SkeletonAccordion } from "../components";
import { guessName } from "../../../../utils/format.js";
import useParticipantNameMap from "../hooks/useParticipantNameMap.js";

export default function FilesPage() {
  const navigate = useNavigate();
  const { notify, confirm } = useModal();
  const { setBadgeLocal } = useFileBadge();
  const { user, displayName, meetingId, meetingTitle } = useMeetingInfo();
  const {
    menus,
    visibleMenus,
    loading: loadingMenus,
    error: errMenus,
  } = useMeetingMenus();

  const {
    files,
    loadingFiles,
    errFiles,
    loadFiles,
    uploading,
    handleUpload,
    handleDelete,
  } = useFiles({ meetingId, notify, confirm, setBadgeLocal });

  const { historyGroups, loadingHistory, errHistory, reloadHistory } =
    useFilesHistory({ meetingId });

  const {
    ready: mediaReady,
    micOn,
    camOn,
    startMic,
    stopMic,
    startCam,
    stopCam,
  } = useMediaRoom();

  const { nameMap } = useParticipantNameMap(meetingId);

  // ==========================
  // 🔎 Search State
  // ==========================
  const [q, setQ] = useState("");
  const [qHistory, setQHistory] = useState("");

  // ==========================
  // 📜 History toggle
  // ==========================
  const [showHistory, setShowHistory] = useState(false);

  // ==========================
  // 📂 Upload ref
  // ==========================
  const fileInputRef = useRef(null);

  // ==========================
  // 👑 isHost?
  // ==========================
  const isHost = /^(host|admin)$/i.test(user?.role || "");

  // ==========================
  // 🎙 Mic/Cam Action
  // ==========================
  const onToggleMic = () => {
    if (!mediaReady) return;
    micOn ? stopMic() : startMic();
  };

  const onToggleCam = () => {
    if (!mediaReady) return;
    camOn ? stopCam() : startCam();
  };

  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  // =====================================================
  // 👥 GROUP FILES BY UPLOADER
  // =====================================================
  // Kita pengen struktur:
  // {
  //   tabsOrder: [ { key: "me", label: "Own" }, { key: "42", label: "Andi" }, ... ],
  //   map: {
  //     "me": [fileSaya, ...],
  //     "42": [fileAndi, ...]
  //   }
  // }
  const grouped = useMemo(() => {
    const currUserId = user?.id;
    const bucketMap = {};
    const tabNameMap = {};

    for (const f of files) {
      const uploaderId = f.uploaderId;
      const rawBackendName = f.uploaderName || "Unknown";

      const isMe =
        currUserId != null && Number(uploaderId) === Number(currUserId);

      const key = isMe ? "me" : String(uploaderId || "unknown");

      // masukkan file ke bucket
      if (!bucketMap[key]) bucketMap[key] = [];
      bucketMap[key].push(f);

      // tentukan label tab
      if (!tabNameMap[key]) {
        if (isMe) {
          tabNameMap[key] = "Own";
        } else {
          // pakai displayName dari participant list kalau ada
          const pretty =
            nameMap?.[String(uploaderId)] || rawBackendName || "Participant";
          tabNameMap[key] = pretty;
        }
      }
    }

    // urutkan tab: "me" dulu, lalu alfabetis
    const keys = Object.keys(bucketMap);
    const meFirst = [];
    const others = [];

    keys.forEach((k) => {
      if (k === "me") {
        meFirst.push({
          key: "me",
          label: tabNameMap["me"] || "Own",
        });
      } else {
        others.push({
          key: k,
          label: tabNameMap[k] || k,
        });
      }
    });

    others.sort((a, b) =>
      (a.label || "").toLowerCase().localeCompare((b.label || "").toLowerCase())
    );

    return {
      tabsOrder: [...meFirst, ...others],
      map: bucketMap,
    };
  }, [files, user?.id, nameMap]);

  // =====================================================
  // 🗂 ACTIVE TAB
  // =====================================================
  const [activeTab, setActiveTab] = useState("me");

  // make sure activeTab tetap valid walau data berubah
  // (misal aktif "me" tapi belum ada file "me", fallback tab pertama aja)
  const safeActiveTab = useMemo(() => {
    if (!grouped.tabsOrder || grouped.tabsOrder.length === 0) return "";
    const found = grouped.tabsOrder.find((t) => t.key === activeTab);
    return found ? activeTab : grouped.tabsOrder[0].key;
  }, [activeTab, grouped.tabsOrder]);

  // =====================================================
  // 🔍 FILTER BY SEARCH (q) DI DALAM TAB AKTIF
  // =====================================================
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const listInTab = grouped.map[safeActiveTab] || [];

    if (!term) return listInTab;

    return listInTab.filter(
      (f) =>
        (f.name || "").toLowerCase().includes(term) ||
        (f.uploaderName || "").toLowerCase().includes(term)
    );
  }, [grouped.map, safeActiveTab, q]);

  const openFile = (f) => {
    const abs = f.urlAbs || f.url;
    if (!abs) return;
    window.open(abs, "_blank", "noopener,noreferrer");
  };

  const downloadFile = (f) => {
    const abs = f.urlAbs || f.url;
    if (!abs) return;
    const a = document.createElement("a");
    a.href = abs;
    a.download = f.name || guessName(f.url);
    a.rel = "noopener";
    a.click();
    notify({
      variant: "success",
      title: "Downloaded",
      message: `File "${f.name}" berhasil diunduh`,
      autoCloseMs: 2500,
    });
  };

  const handleSubmitUpload = async (e) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    await handleUpload(file);
    fileInputRef.current.value = "";
  };

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  const hasQuery = q.trim().length > 0;

  return (
    <MeetingLayout
      meetingId={meetingId}
      userId={user?.id}
      userRole={user?.role || "participant"}
      meetingTitle={meetingTitle}
    >
      <div className="pd-app files-page">
        <MeetingHeader displayName={displayName} user={user} />

        <main className="pd-main">
          <section className="files-wrap">
            {/* =======================
                HEADER BAR
            ======================= */}
            <div className="files-header">
              <div className="files-title">
                <img src="img/Files1.png" alt="" className="files-title-icon" />
                <span className="files-title-text">Files</span>
              </div>

              <div className="files-actions">
                {/* search global in tab */}
                <div className="files-search">
                  <input
                    type="text"
                    placeholder="Search file or uploader…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>

                <button
                  className={`files-btn ${showHistory ? "active" : ""}`}
                  onClick={() => setShowHistory((s) => !s)}
                >
                  <Icon iconUrl="img/history.png" size={18} />
                  <span>{showHistory ? "Close History" : "History"}</span>
                </button>

                <button
                  className="files-btn ghost"
                  onClick={() => {
                    loadFiles();
                    reloadHistory();
                  }}
                  disabled={loadingFiles || loadingHistory}
                  title="Refresh"
                >
                  <Icon iconUrl="img/refresh.png" size={18} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* =======================
                UPLOADER BAR
            ======================= */}
            <form className="file-uploader" onSubmit={handleSubmitUpload}>
              <input id="file-input" ref={fileInputRef} type="file" />
              <button
                className="files-btn"
                type="submit"
                disabled={uploading || !meetingId}
              >
                <img
                  src="img/upload1.png"
                  alt="Upload"
                  style={{ width: 18, height: 18 }}
                />
                <span>{uploading ? "Mengunggah…" : "Upload"}</span>
              </button>
            </form>

            {/* =======================
                MAIN CONTENT: SIDEBAR TABS + GRID
            ======================= */}
            <div className="files-body-split">
              {/* ---- Sidebar tabs (uploader list) ---- */}
              <aside className="files-sidebar">
                {loadingFiles && <div className="pd-empty">Loading…</div>}
                {!loadingFiles &&
                  !errFiles &&
                  grouped.tabsOrder.length === 0 && (
                    <div className="pd-empty">No uploader yet</div>
                  )}

                {!loadingFiles &&
                  !errFiles &&
                  grouped.tabsOrder.length > 0 &&
                  grouped.tabsOrder.map((tab) => {
                    const isActive = tab.key === safeActiveTab;
                    return (
                      <button
                        key={tab.key}
                        className={`files-sidebar-tab ${
                          isActive ? "active" : ""
                        }`}
                        onClick={() => setActiveTab(tab.key)}
                      >
                        <div className="files-sidebar-label">
                          {tab.label || "—"}
                        </div>
                        <div className="files-sidebar-count">
                          {(grouped.map[tab.key] || []).length}
                        </div>
                      </button>
                    );
                  })}
              </aside>

              {/* ---- File list grid (inside active tab) ---- */}
              <div className="files-content">
                {loadingFiles && <SkeletonGrid />}

                {errFiles && !loadingFiles && (
                  <div className="pd-error">Gagal memuat files: {errFiles}</div>
                )}

                {!loadingFiles && !errFiles && (
                  <>
                    {filtered.length === 0 ? (
                      <div className="pd-empty">
                        {hasQuery
                          ? "Tidak ada file ditemukan"
                          : "Belum ada file."}
                      </div>
                    ) : (
                      <div className="mtl-grid files-grid">
                        {filtered.map((f) => (
                          <FileCard
                            key={f.fileId || f.url}
                            file={f}
                            me={user}
                            nameMap={nameMap}
                            onOpen={() => openFile(f)}
                            onDownload={() => downloadFile(f)}
                            onDelete={() => handleDelete(f.fileId)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* =======================
                HISTORY SECTION
            ======================= */}
            {showHistory && (
              <section className="files-history">
                <div className="files-history-head">
                  <h3 className="files-history-title">
                    <Icon iconUrl="img/history.png" size={18} /> History Files
                  </h3>

                  <div className="files-history-actions">
                    <input
                      className="files-history-search"
                      type="text"
                      placeholder="Search in history…"
                      value={qHistory}
                      onChange={(e) => setQHistory(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && reloadHistory(qHistory)
                      }
                    />
                    <button
                      className="files-btn"
                      onClick={() => reloadHistory(qHistory)}
                    >
                      <Icon slug="search" size={16} />
                      <span>Search</span>
                    </button>
                  </div>
                </div>

                {loadingHistory && <SkeletonAccordion />}
                {errHistory && !loadingHistory && (
                  <div className="pd-error">
                    Gagal memuat riwayat: {errHistory}
                  </div>
                )}
                {!loadingHistory &&
                  !errHistory &&
                  historyGroups.length === 0 && (
                    <div className="pd-empty">Belum ada riwayat files.</div>
                  )}
                {!loadingHistory && !errHistory && historyGroups.length > 0 && (
                  <div className="files-accordion">
                    {historyGroups.map((g) => (
                      <HistoryAccordion
                        key={g.meetingId}
                        title={g.title || `Meeting #${g.meetingId}`}
                        status={g.status}
                        startTime={g.startTime}
                        endTime={g.endTime}
                        count={g.files?.length || 0}
                        classPrefix="facc"
                        emptyText="No files available."
                      >
                        <div className="mtl-grid files-grid">
                          {g.files.map((f) => (
                            <FileCard
                              key={f.fileId || f.url}
                              file={f}
                              me={user}
                              nameMap={nameMap}
                              onOpen={() => openFile(f)}
                              onDownload={() => downloadFile(f)}
                              onDelete={() => handleDelete(f.fileId)}
                            />
                          ))}
                        </div>
                      </HistoryAccordion>
                    ))}
                  </div>
                )}
              </section>
            )}

            {errMenus && (
              <div className="pd-error" style={{ marginTop: 12 }}>
                Failed to load menu: {errMenus}
              </div>
            )}
          </section>
        </main>

        {/* Bottom Nav */}
        {!loadingMenus && !errMenus && (
          <BottomNav
            items={visibleMenus}
            active="files"
            onSelect={handleSelectNav}
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
