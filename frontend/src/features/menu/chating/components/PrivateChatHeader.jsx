// src/features/chat/components/PrivateChatHeader.jsx
import React from "react";

export default function PrivateChatHeader({ onBack }) {
  return (
    <div className="private-chat-header">
      <button className="private-back-btn" onClick={onBack}>
        <span className="arrow-icon">&lt;</span>
        <span>Kembali ke Daftar Peserta</span>
      </button>
    </div>
  );
}
