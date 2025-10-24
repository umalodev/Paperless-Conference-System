import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import MeetingLayout from "../../../../components/MeetingLayout.jsx";
import MeetingHeader from "../../../../components/MeetingHeader.jsx";
import MeetingFooter from "../../../../components/MeetingFooter.jsx";
import BottomNav from "../../../../components/BottomNav.jsx";
import Icon from "../../../../components/Icon.jsx";

import { useMediaRoom } from "../../../../contexts/MediaRoomContext.jsx";
import { useModal } from "../../../../contexts/ModalProvider.jsx";
import useMeetingGuard from "../../../../hooks/useMeetingGuard.js";
import useMeetingInfo from "../../../../hooks/useMeetingInfo.js";
import useMeetingMenus from "../../../../hooks/useMeetingMenus.js";

import { useNotes, useNoteComposer, useNoteEdit } from "../hooks";
import { formatDate } from "../../../../utils/format.js";

import {
  NoteCard,
  NotesComposer,
  NotesEmpty,
  NotesSkeleton,
} from "../components";

import "../styles/Notes.css";

export default function NotesPage() {
  const navigate = useNavigate();
  const { confirm, notify } = useModal();

  // ✅ Ambil info meeting dan user
  const { user, displayName, meetingId, meetingTitle } = useMeetingInfo();

  // ✅ Ambil menu menggunakan hook global
  const { menus, visibleMenus, loading: loadingMenus, error: errMenus } =
    useMeetingMenus();

  // ✅ Kontrol mic/cam
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

  // ✅ Navigasi menu bawah
  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  // ✅ Notes hooks
  const { notes, setNotes, loadingNotes, errNotes, loadNotes } =
    useNotes(meetingId);

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

  const saving = savingComposer || savingEdit;

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  // ✅ Refresh catatan
  const reloadNotes = useCallback(async () => {
    try {
      await loadNotes();
    } catch (err) {
      console.error("Failed to reload notes:", err);
    }
  }, [loadNotes]);

  return (
    <MeetingLayout
      meetingId={meetingId}
      userId={user?.id}
      userRole={user?.role || "participant"}
      meetingTitle={meetingTitle}
    >
      <div className="pd-app notes-page">
        {/* Header */}
        <MeetingHeader displayName={displayName} user={user} />

        {/* Main */}
        <main className="pd-main">
          <section className="notes-wrap">
            {/* Header actions */}
            <div className="notes-header">
              <div className="notes-title">
                <img
                  src="/img/notebook.png"
                  alt="Catatan"
                  className="action-icon"
                />
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
            active="notes"
            onSelect={handleSelectNav}
          />
        )}
        {errMenus && (
          <div className="pd-error" style={{ marginTop: 12 }}>
            Gagal memuat menu: {errMenus}
          </div>
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
