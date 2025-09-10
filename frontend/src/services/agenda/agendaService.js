// src/services/agenda/agendaService.js
import { API_URL } from "../../config";

/**
 * Get agenda items for a meeting
 * @param {string} meetingId - Meeting ID
 * @returns {Promise<Array>} Array of agenda items
 */
export async function getAgendaItems(meetingId) {
  const res = await fetch(
    `${API_URL}/api/agenda?meetingId=${encodeURIComponent(meetingId)}`,
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
 * Create a new agenda item
 * @param {Object} agendaData - Agenda item data
 * @returns {Promise<Object>} Created agenda item
 */
export async function createAgendaItem(agendaData) {
  const res = await fetch(`${API_URL}/api/agenda`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(agendaData),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || `HTTP ${res.status}`);
  }
  
  const json = await res.json();
  return json.data;
}

/**
 * Update an agenda item
 * @param {string} agendaId - Agenda item ID
 * @param {Object} agendaData - Updated agenda item data
 * @returns {Promise<Object>} Updated agenda item
 */
export async function updateAgendaItem(agendaId, agendaData) {
  const res = await fetch(`${API_URL}/api/agenda/${agendaId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(agendaData),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || `HTTP ${res.status}`);
  }
  
  const json = await res.json();
  return json.data;
}

/**
 * Delete an agenda item
 * @param {string} agendaId - Agenda item ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteAgendaItem(agendaId) {
  const res = await fetch(`${API_URL}/api/agenda/${agendaId}`, {
    method: "DELETE",
    credentials: "include",
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || `HTTP ${res.status}`);
  }
  
  return true;
}
