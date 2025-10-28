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

  const [q, setQ] = useState("");
  const [qHistory, setQHistory] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef(null);

  const isHost = /^(host|admin)$/i.test(user?.role || "");

  const onToggleMic = () => {
    if (!mediaReady) return;
    micOn ? stopMic() : startMic();
  };

  const onToggleCam = () => {
    if (!mediaReady) return;
    camOn ? stopCam() : startCam();
  };

  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return files;
    return files.filter(
      (f) =>
        (f.name || "").toLowerCase().includes(term) ||
        (f.uploaderName || "").toLowerCase().includes(term)
    );
  }, [files, q]);

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
            <div className="files-header">
              <div className="files-title">
                <img src="img/Files1.png" alt="" className="files-title-icon" />
                <span className="files-title-text">Files</span>
              </div>

              <div className="files-actions">
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

            {/* Upload form */}
            {isHost && (
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
            )}

            {/* File list */}
            {loadingFiles && <SkeletonGrid />}
            {errFiles && !loadingFiles && (
              <div className="pd-error">Gagal memuat files: {errFiles}</div>
            )}

            {!loadingFiles && !errFiles && (
              <>
                {filtered.length === 0 ? (
                  <div className="pd-empty">
                    {hasQuery ? "Tidak ada file ditemukan" : "Belum ada file."}
                  </div>
                ) : (
                  <div className="mtl-grid files-grid">
                    {filtered.map((f) => (
                      <FileCard
                        key={f.fileId || f.url}
                        file={f}
                        me={user}
                        onOpen={() => openFile(f)}
                        onDownload={() => downloadFile(f)}
                        onDelete={() => handleDelete(f.fileId)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* History */}
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
