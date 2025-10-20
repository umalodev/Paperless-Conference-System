// src/features/chat/components/ChatComposer.jsx
import React from "react";
import Icon from "../../../../components/Icon.jsx";

export default function ChatComposer({
  text,
  setText,
  onSend,
  onKeyDown,
  onFileUpload,
  sending,
}) {
  return (
    <div className="chat-composer">
      <div className="composer-left">
        <label className="chat-iconbtn" title="Lampirkan File">
          <Icon slug="attach" iconUrl="/img/icons/attach.svg" size={20} />
          <input
            type="file"
            style={{ display: "none" }}
            onChange={onFileUpload}
          />
        </label>
      </div>
      <textarea
        className="chat-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder="Ketik pesan..."
      />
      <button
        className="chat-send"
        onClick={onSend}
        disabled={sending || !text.trim()}
        title="Kirim"
      >
        <Icon slug="send" />
      </button>
    </div>
  );
}
