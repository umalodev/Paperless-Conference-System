// src/features/chat/components/ChatComposer.jsx
import React, { useRef } from "react";
import Icon from "../../../../components/Icon.jsx";

export default function ChatComposer({
  text,
  setText,
  onSend,
  onKeyDown,
  onFileUpload,
  sending,
}) {
  const fileInputRef = useRef();

  return (
    <div className="chat-composer-modern">
      {/* Tombol file */}
      <button
        className="composer-btn attach"
        title="Lampirkan File"
        onClick={() => fileInputRef.current?.click()}
      >
        <Icon slug="attach" iconUrl="/img/icons/attach.svg" size={18} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={onFileUpload}
      />

      {/* Text area */}
      <textarea
        className="composer-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Tulis pesan..."
        rows={1}
      />

      {/* Tombol kirim */}
      <button
        className={`composer-btn send ${sending ? "disabled" : ""}`}
        onClick={onSend}
        disabled={sending || !text.trim()}
        title="Kirim Pesan"
      >
        <Icon slug="send" />
      </button>
    </div>
  );
}
