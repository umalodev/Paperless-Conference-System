// src/features/chat/components/ChatHeader.jsx
import React from "react";
import Icon from "../../../../components/Icon.jsx";

export default function ChatHeader({
  chatMode,
  selectedParticipant,
  onSwitchToPrivate,
  onSwitchToGlobal,
  user,
  loadParticipants,
}) {
  return (
    <div className="chat-header">
      <div className="chat-title">
        <img src="/img/Chating1.png" alt="" className="chat-title-icon" />
        <span className="chat-title-text">
          {chatMode === "global"
            ? "Chatting"
            : `Chat dengan ${selectedParticipant?.displayName || "Participant"}`}
        </span>
      </div>
      <div className="chat-mode-buttons">
        <button
          className={`chat-mode-btn ${chatMode === "private" ? "active" : ""}`}
          onClick={() => {
            onSwitchToPrivate();
            if (user?.id) loadParticipants();
          }}
          title="Chat Pribadi"
        >
          <Icon slug="users" iconUrl="/img/participant.png" size={20} />
        </button>
        <button
          className={`chat-mode-btn ${chatMode === "global" ? "active" : ""}`}
          onClick={onSwitchToGlobal}
          title="Chat Global"
        >
          <Icon slug="chat" iconUrl="/img/chat.svg" size={20} />
        </button>
      </div>
    </div>
  );
}
