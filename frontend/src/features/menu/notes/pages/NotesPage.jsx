import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../../../components/BottomNav.jsx";
import MeetingLayout from "../../../../components/MeetingLayout.jsx";
import MeetingFooter from "../../../../components/MeetingFooter.jsx";
import MeetingHeader from "../../../../components/MeetingHeader.jsx";
import useMeetingGuard from "../../../../hooks/useMeetingGuard.js";
import { useMediaRoom } from "../../../../contexts/MediaRoomContext.jsx";
import { useModal } from "../../../../contexts/ModalProvider.jsx";
import meetingService from "../../../../services/meetingService.js";
import { API_URL } from "../../../../config.js";
import "../styles/Notes.css";
import Icon from "../../../../components/Icon.jsx";

// hooks & utils
import { useNotes, useNoteComposer, useNoteEdit } from "../hooks";
import { formatDate } from "../../../../utils/format.js";

// components
import {
  NoteCard,
  NotesComposer,
  NotesEmpty,
  NotesSkeleton,
} from "../components";

export default function NotesPage() {
  const [user, setUser] = useState(null);
  const { confirm } = useModal();
  const navigate = useNavigate();

  // ====== MediaRoom ======
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

  // ====== Meeting ======
  const meetingId = useMemo(() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || cm?.code || null;
    } catch {
      return null;
    }
  }, []);

  // ====== User info ======
  const [displayName, setDisplayName] = useState("");
  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    const dn = localStorage.getItem("pconf.displayName") || "";
    setDisplayName(dn);
  }, []);

  // ====== Menus ======
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
              flag: m.flag ?? "Y",
              iconUrl: m.iconMenu || null,
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

  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  // ====== Notes Hooks ======
  const { notes, setNotes, loadingNotes, errNotes, loadNotes } = useNotes(meetingId);

  const {
    title,
    body,
    showBodyHint,
    saving: savingComposer,
    setTitle,
    setBody,
    handleAdd,
    resetComposer,
  } = useNoteComposer({ meetingId });

  const {
    editingId,
    editTitle,
    editBody,
    saving: savingEdit,
    setEditTitle,
    setEditBody,
    startEdit,
    cancelEdit,
    saveEdit,
    handleDelete,
  } = useNoteEdit({ confirm });

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  const saving = savingComposer || savingEdit;

  // ====== Simplified refresh (tanpa modal/notify) ======
  const reloadNotes = useCallback(async () => {
    try {
      await loadNotes();
    } catch (err) {
      console.error("Failed to reload notes:", err);
    }
  }, [loadNotes]);

  // ====== Render ======
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
      <div className="pd-app">
        {/* Header */}
        <MeetingHeader displayName={displayName} user={user} />


        {/* Main */}
        <main className="pd-main">
          <section className="notes-wrap">
            {/* Header actions */}
            <div className="notes-header">
              <div className="notes-title">
                <img src="/img/notebook.png" alt="Catatan" className="action-icon" />
                <span>Notes</span>
              </div>
              <div className="notes-actions">
                <button
                  className="note-btn ghost"
                  onClick={reloadNotes}
                  title="Refresh"
                  aria-label="Refresh"
                >
                  <Icon iconUrl="/img/refresh.png" size={18} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Composer */}
            <NotesComposer
              title={title}
              body={body}
              showBodyHint={showBodyHint}
              saving={saving}
              onTitleChange={setTitle}
              onBodyChange={setBody}
              onSubmit={(e) => handleAdd(e, setNotes)}
              onClear={resetComposer}
            />

            {/* Notes list */}
            {loadingNotes && <NotesSkeleton />}
            {errNotes && !loadingNotes && (
              <div className="pd-error">Failed to load notes: {errNotes}</div>
            )}
            {!loadingNotes && !errNotes && (
              <>
                {notes.length === 0 ? (
                  <NotesEmpty />
                ) : (
                  <div className="notes-grid">
                    {notes.map((n) => (
                      <NoteCard
                        key={n.id}
                        note={n}
                        editing={editingId === n.id}
                        editTitle={editTitle}
                        editBody={editBody}
                        saving={saving}
                        onEditTitle={setEditTitle}
                        onEditBody={setEditBody}
                        onStartEdit={() => startEdit(n)}
                        onCancelEdit={cancelEdit}
                        onSaveEdit={() => saveEdit(setNotes)}
                        onDelete={() => handleDelete(n.id, setNotes)}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </main>

        {/* Bottom Navigation */}
        {!loadingMenus && !errMenus && (
          <BottomNav
            items={visibleMenus}
            active="note"
            onSelect={handleSelectNav}
          />
        )}

        {/* Footer */}
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
