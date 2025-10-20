import React from "react";

export default function NotesComposer({
  title,
  body,
  showBodyHint,
  saving,
  onTitleChange,
  onBodyChange,
  onSubmit,
  onClear,
}) {
  return (
    <form className="notes-composer" onSubmit={onSubmit}>
      <input
        className="note-input"
        placeholder="Note title"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
      />

      <div className="note-field note-field--body">
        <textarea
          className="note-textarea"
          placeholder="Write note..."
          rows={3}
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          aria-invalid={showBodyHint ? "true" : undefined}
          aria-describedby={showBodyHint ? "body-tip" : undefined}
        />
        {showBodyHint && (
          <span id="body-tip" className="notes-tooltip" role="tooltip">
            Isi catatan tidak boleh kosong
          </span>
        )}
      </div>

      <div className="notes-composer-actions">
        <button className="note-btn primary" type="submit" disabled={saving}>
          <SaveIcon />
          <span>Save</span>
        </button>
        {(title || body) && (
          <button className="note-btn" onClick={onClear} disabled={saving}>
            <img
              src="/img/delete.png"
              alt="Delete"
              style={{ width: "20px", height: "20px" }}
            />
            <span>Clear</span>
          </button>
        )}
      </div>
    </form>
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
