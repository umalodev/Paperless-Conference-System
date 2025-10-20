// src/features/chat/components/PrivateChatHeader.jsx
import React from "react";

export default function PrivateChatHeader({ onBack }) {
  return (
    <div className="chat-back-button">
      <button className="back-btn" onClick={onBack}>
        ← Kembali ke Daftar Participant
      </button>
    </div>
  );
}
