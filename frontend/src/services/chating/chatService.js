// src/services/chating/chatService.js
import { API_URL } from "../../config";

/**
 * Get chat messages for a meeting
 * @param {string} meetingId - Meeting ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of chat messages
 */
export async function getChatMessages(meetingId, options = {}) {
  const { limit = 50, userReceiveId = null } = options;
  
  let url = `${API_URL}/api/chat/meeting/${meetingId}/messages?limit=${limit}`;
  
  // Add userReceiveId for private chat
  if (userReceiveId) {
    url += `&userReceiveId=${encodeURIComponent(userReceiveId)}`;
  }
  
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  
  const json = await res.json();
  return json.data || [];
}

/**
 * Send a chat message
 * @param {Object} messageData - Message data
 * @returns {Promise<Object>} Sent message
 */
export async function sendChatMessage(messageData) {
  const res = await fetch(`${API_URL}/api/chat/send`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messageData),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || `HTTP ${res.status}`);
  }
  
  const json = await res.json();
  return json.data;
}

/**
 * Get chat participants for a meeting
 * @param {string} meetingId - Meeting ID
 * @returns {Promise<Array>} Array of chat participants
 */
export async function getChatParticipants(meetingId) {
  const res = await fetch(
    `${API_URL}/api/chat/meeting/${meetingId}/participants`,
    {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    }
  );
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  
  const json = await res.json();
  return json.data || [];
}

/**
 * Mark messages as read
 * @param {string} meetingId - Meeting ID
 * @param {string} userReceiveId - User ID to mark messages as read from
 * @returns {Promise<boolean>} Success status
 */
export async function markMessagesAsRead(meetingId, userReceiveId = null) {
  const url = userReceiveId 
    ? `${API_URL}/api/chat/meeting/${meetingId}/read?userReceiveId=${encodeURIComponent(userReceiveId)}`
    : `${API_URL}/api/chat/meeting/${meetingId}/read`;
    
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || `HTTP ${res.status}`);
  }
  
  return true;
}
