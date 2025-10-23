// src/features/chat/components/ChatList.jsx
import React, { useEffect } from "react";
import MessageItem from "./MessageItem.jsx";

/**
 * ChatList — displays the list of chat messages.
 * Renders MessageItem components with smooth transition effects
 * and automatically scrolls to the latest message.
 */
export default function ChatList({ messages = [], userId, listRef }) {
  // Automatically scroll to the newest message
  useEffect(() => {
    if (listRef?.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, listRef]);

  // Empty state — no messages yet
  if (!messages.length) {
    return (
      <div className="chat-list empty-state">
        <div className="empty-chat">
          <img
            src="/img/message.png"
            alt="No messages"
            className="empty-chat-icon"
          />
          <p className="empty-chat-text">
            No messages yet. Start a conversation!
          </p>
        </div>
      </div>
    );
  }

  // Render message list
  return (
    <div className="chat-list" ref={listRef}>
      {messages.map((m, index) => (
        <div
          key={`${m.id}-${m.userId}-${m.ts}-${index}`}
          className="chat-message-wrapper"
        >
          <MessageItem
            msg={m}
            isMine={String(userId) === String(m.userId)}
          />
        </div>
      ))}
    </div>
  );
}
