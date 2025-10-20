// src/features/chat/hooks/useChatSocket.js
import { useEffect } from "react";
import { chatSocket } from "../services";

/**
 * Hook untuk koneksi dan event real-time chat
 */
export default function useChatSocket({
  meetingId,
  userId,
  baseUrl,
  chatMode,
  selectedParticipant,
  nameByUserId,
  onNewMessage,
}) {
  useEffect(() => {
    if (!meetingId || !userId) return;
    const socket = chatSocket.connect(meetingId, userId, baseUrl);

    const handleIncoming = (data) => {
      if (data?.type !== "chat_message") return;
      const senderName =
        data.displayName ||
        nameByUserId.get(String(data.userId)) ||
        data.name ||
        data.username ||
        "Participant";

      const msg = {
        id: data.messageId,
        userId: data.userId,
        name: senderName,
        text: data.message,
        ts: data.timestamp,
        messageType: data.messageType,
        filePath: data.filePath,
        originalName: data.originalName,
        mimeType: data.mimeType,
        userReceiveId: data.userReceiveId,
      };

      // Filter sesuai mode (global/private)
      if (chatMode === "global" && !data.userReceiveId) onNewMessage(msg);
      else if (chatMode === "private" && selectedParticipant) {
        const isToMe = String(data.userReceiveId) === String(userId);
        const isFromMe = String(data.userId) === String(userId);
        const isFromSelected =
          String(data.userId) === String(selectedParticipant.userId);
        const isToSelected =
          String(data.userReceiveId) === String(selectedParticipant.userId);
        if ((isToMe && isFromSelected) || (isToSelected && isFromMe))
          onNewMessage(msg);
      }
    };

    chatSocket.on("chat_message", handleIncoming);
    return () => chatSocket.off("chat_message", handleIncoming);
  }, [meetingId, userId, chatMode, selectedParticipant, nameByUserId, onNewMessage]);
}
