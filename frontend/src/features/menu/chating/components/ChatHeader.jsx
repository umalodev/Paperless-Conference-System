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
  const isGlobal = chatMode === "global";
  const title = isGlobal
    ? "Chatting"
    : selectedParticipant?.displayName || "Participant";
  const subtitle = isGlobal ? "Mode Global" : "Mode Pribadi";

  return (
    <header className="chat-header-float">
      <div className="chat-header-left">
        <img
          src="img/Chating1.png"
          alt="Chat Icon"
          className="chat-title-icon"
        />
        <div className="chat-title-texts">
          <h3 className="chat-title-main">{title}</h3>
          <p className="chat-title-sub">{subtitle}</p>
        </div>
      </div>

      <div className="chat-mode-switch">
        <button
          className={`chat-mode-item ${!isGlobal ? "active" : ""}`}
          onClick={() => {
            onSwitchToPrivate();
            if (user?.id) loadParticipants();
          }}
          title="Chat Pribadi"
        >
          <Icon slug="users" iconUrl="img/participant.png" size={18} />
        </button>
        <button
          className={`chat-mode-item ${isGlobal ? "active" : ""}`}
          onClick={onSwitchToGlobal}
          title="Chat Global"
        >
          <Icon slug="chat" iconUrl="img/chat.svg" size={18} />
        </button>
      </div>
    </header>
  );
}
