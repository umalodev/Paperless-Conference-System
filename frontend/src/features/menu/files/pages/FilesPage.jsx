import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../../../components/BottomNav.jsx";
import Icon from "../../../../components/Icon.jsx";
import "../styles/files.css";
import useMeetingGuard from "../../../../hooks/useMeetingGuard.js";
import MeetingHeader from "../../../../components/MeetingHeader.jsx";
import MeetingFooter from "../../../../components/MeetingFooter.jsx";
import MeetingLayout from "../../../../components/MeetingLayout.jsx";
import { useMediaRoom } from "../../../../contexts/MediaRoomContext.jsx";
import { useModal } from "../../../../contexts/ModalProvider.jsx";
import { API_URL } from "../../../../config.js"; // ✅ WAJIB: untuk fetch menus
import meetingService from "../../../../services/meetingService.js";
import { formatTime,guessName } from "../../../../utils/format.js";

import {
  FileCard,
  FilesHistoryGroup,
  SkeletonGrid,
  SkeletonAccordion,
} from "../components";
import { useFiles, useFilesHistory, useFileBadge } from "../hooks";

export default function FilesPage() {
  // ===== STATE =====
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "{}")
  );
  const [displayName, setDisplayName] = useState(
    localStorage.getItem("pconf.displayName") || ""
  );
  const [q, setQ] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [qHistory, setQHistory] = useState("");
  const fileInputRef = useRef(null);

  const navigate = useNavigate();
  const { notify, confirm } = useModal();
  const { setBadgeLocal } = useFileBadge();

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

  // ===== FILES HOOKS =====
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

  // ===== MEETING GUARD =====
  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  // ===== MEDIA CONTROL =====
  const onToggleMic = () => {
    if (!mediaReady) return;
    micOn ? stopMic() : startMic();
  };

  const onToggleCam = () => {
    if (!mediaReady) return;
    camOn ? stopCam() : startCam();
  };

  // ===== FILTER =====
  const filtered = useMemo(() => {
    const term = (q || "").trim().toLowerCase();
    if (!term) return files;
    return files.filter(
      (f) =>
        (f.name || "").toLowerCase().includes(term) ||
        (f.uploaderName || "").toLowerCase().includes(term)
    );
  }, [files, q]);

  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

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
      title: "Success",
      message: `File "${f.name}" berhasil diunduh`,
      autoCloseMs: 3000,
    });
  };

  const handleSubmitUpload = async (e) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    await handleUpload(file);
    fileInputRef.current.value = "";
  };

  const hasQuery = (q || "").trim().length > 0;

  // ===== RENDER =====
  return (
    <MeetingLayout
      meetingId={meetingId}
      userId={user?.id}
      userRole={user?.role || "participant"}
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
      <div className="pd-app files-page">
        {/* ===== TOPBAR ===== */}
        <MeetingHeader displayName={displayName} user={user} />


        {/* ===== CONTENT ===== */}
        <main className="pd-main">
          <section className="files-wrap">
            <div className="files-header">
              <div className="files-title">
                <img
                  src="/img/Files1.png"
                  alt=""
                  className="files-title-icon"
                />
                <span className="files-title-text">Files</span>
              </div>
              <div className="files-actions">
                <div className="files-search">
                  <input
                    type="text"
                    placeholder="Search file atau uploader…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                <button
                  className={`files-btn ${showHistory ? "active" : ""}`}
                  onClick={() => setShowHistory((s) => !s)}
                  title="Riwayat file meeting sebelumnya"
                >
                  <Icon iconUrl="/img/history.png" size={18} />
                  <span>{showHistory ? "Close History" : "History"}</span>
                </button>
                <button
                  className="files-btn ghost"
                  onClick={() => {
                    loadFiles(); // 🔁 Re-fetch daftar file sekarang
                    reloadHistory(); // 🔁 Re-fetch riwayat meeting
                  }}
                  disabled={loadingFiles || loadingHistory}
                  title="Refresh"
                >
                  <Icon iconUrl="/img/refresh.png" size={18} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* ===== UPLOAD FORM ===== */}
            <form className="file-uploader" onSubmit={handleSubmitUpload}>
              <input id="file-input" ref={fileInputRef} type="file" />
              <button
                className="files-btn"
                type="submit"
                disabled={uploading || !meetingId}
              >
                <img
                  src="/img/upload1.png"
                  alt="Upload"
                  style={{ width: 18, height: 18 }}
                />
                <span>{uploading ? "Mengunggah…" : "Upload"}</span>
              </button>
            </form>

            {/* ===== FILE LIST ===== */}
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

            {/* ===== HISTORY ===== */}
            {showHistory && (
              <>
                <div className="files-divider" />
                <section className="files-history">
                  <div className="files-history-head">
                    <h3 className="files-history-title">
                      <Icon iconUrl="/img/history.png" size={18} /> History
                      Files
                    </h3>
                    <div className="files-history-actions">
                      <input
                        className="files-history-search"
                        type="text"
                        placeholder="Search in history…"
                        value={qHistory}
                        onChange={(e) => setQHistory(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && fetchHistory(qHistory)
                        }
                      />
                      <button
                        className="files-btn"
                        onClick={() => fetchHistory(qHistory)}
                      >
                        <Icon slug="search" size={16} />
                        <span>Cari</span>
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
                  {!loadingHistory &&
                    !errHistory &&
                    historyGroups.length > 0 && (
                      <div className="files-accordion">
                        {historyGroups.map((g) => (
                          <FilesHistoryGroup
                            key={g.meetingId}
                            group={g}
                            me={user}
                            onOpen={(f) => openFile(f)}
                            onDownload={(f) => downloadFile(f)}
                            onDelete={(id) => handleDelete(id)}
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
