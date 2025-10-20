// src/features/chat/components/ChatList.jsx
import React from "react";
import MessageItem from "./MessageItem.jsx";

export default function ChatList({ messages, userId, listRef }) {
  return (
    <div className="chat-list" ref={listRef}>
      {messages.map((m, index) => (
        <MessageItem
          key={`${m.id}-${m.userId}-${m.ts}-${index}`}
          msg={m}
          isMine={String(userId) === String(m.userId)}
        />
      ))}
    </div>
  );
}
