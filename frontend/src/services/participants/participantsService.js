// src/services/participants/participantsService.js
import { API_URL } from "../../config";

/**
 * Get joined participants for a meeting
 * @param {string} meetingId - Meeting ID
 * @returns {Promise<Array>} Array of joined participants
 */
export async function getJoinedParticipants(meetingId) {
  const qs = meetingId ? `?meetingId=${encodeURIComponent(meetingId)}` : "";
  
  const res = await fetch(`${API_URL}/api/participants/joined${qs}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  
  const json = await res.json();
  return json.data || [];
}

/**
 * Get test participants data (fallback)
 * @returns {Promise<Array>} Array of test participants
 */
export async function getTestParticipants() {
  const res = await fetch(`${API_URL}/api/participants/test-data`, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  
  const json = await res.json();
  return json.data || [];
}

/**
 * Get all participants for a meeting
 * @param {string} meetingId - Meeting ID
 * @returns {Promise<Array>} Array of all participants
 */
export async function getAllParticipants(meetingId) {
  const res = await fetch(
    `${API_URL}/api/participants?meetingId=${encodeURIComponent(meetingId)}`,
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
 * Add a participant to a meeting
 * @param {Object} participantData - Participant data
 * @returns {Promise<Object>} Created participant
 */
export async function addParticipant(participantData) {
  const res = await fetch(`${API_URL}/api/participants`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(participantData),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || `HTTP ${res.status}`);
  }
  
  const json = await res.json();
  return json.data;
}

/**
 * Update participant status
 * @param {string} participantId - Participant ID
 * @param {Object} statusData - Status data
 * @returns {Promise<Object>} Updated participant
 */
export async function updateParticipantStatus(participantId, statusData) {
  const res = await fetch(`${API_URL}/api/participants/${participantId}/status`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(statusData),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || `HTTP ${res.status}`);
  }
  
  const json = await res.json();
  return json.data;
}
