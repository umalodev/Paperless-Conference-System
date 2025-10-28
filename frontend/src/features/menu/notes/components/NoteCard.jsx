import React from "react";
import { formatDate } from "../../../../utils/format.js";

export default function NoteCard({
  note,
  editing,
  editTitle,
  editBody,
  saving,
  onEditTitle,
  onEditBody,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}) {
  if (editing) {
    return (
      <div className="note-card editing" key={note.id}>
        <input
          className="note-input"
          value={editTitle}
          onChange={(e) => onEditTitle(e.target.value)}
          placeholder="Judul catatan"
        />
        <textarea
          className="note-textarea"
          rows={4}
          value={editBody}
          onChange={(e) => onEditBody(e.target.value)}
          placeholder="Isi catatan…"
        />
        <div className="note-meta">
          <span>Diedit sekarang</span>
        </div>
        <div className="note-actions">
          <button
            className="note-btn primary"
            onClick={onSaveEdit}
            disabled={saving}
          >
            <SaveIcon />
            <span>Simpan</span>
          </button>
          <button className="note-btn" onClick={onCancelEdit} disabled={saving}>
            <CancelIcon />
            <span>Batal</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="note-card" key={note.id}>
      <div className="note-title">{note.title || "Untitled"}</div>
      <div className="note-body">{note.body || <i>(tanpa isi)</i>}</div>
      <div className="note-meta">
        <span>{formatDate(note.updatedAt)}</span>
        {note.author && <span> · {note.author}</span>}
      </div>
      <div className="note-actions">
        <button
          className="note-btn"
          onClick={() => onStartEdit(note)}
          disabled={saving}
        >
          <img src="img/edit.png" alt="Edit" className="action-icon" />
          <span>Edit</span>
        </button>
        <button
          className="note-btn danger"
          onClick={() => onDelete(note.id)}
          disabled={saving}
        >
          <img src="img/delete.png" alt="Delete" className="action-icon" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}

function SaveIcon() {
  return (
    <svg
      className="pd-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21V9H7v12" />
      <path d="M7 3v6h8" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg
      className="pd-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
