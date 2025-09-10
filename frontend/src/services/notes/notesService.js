// src/services/notes/notesService.js
import { API_URL } from "../../config";

/**
 * Get notes for a meeting
 * @param {string} meetingId - Meeting ID
 * @returns {Promise<Array>} Array of notes
 */
export async function getNotes(meetingId) {
  const res = await fetch(
    `${API_URL}/api/notes?meetingId=${encodeURIComponent(meetingId)}`,
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
 * Create a new note
 * @param {Object} noteData - Note data
 * @returns {Promise<Object>} Created note
 */
export async function createNote(noteData) {
  const res = await fetch(`${API_URL}/api/notes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(noteData),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || `HTTP ${res.status}`);
  }
  
  const json = await res.json();
  return json.data;
}

/**
 * Update a note
 * @param {string} noteId - Note ID
 * @param {Object} noteData - Updated note data
 * @returns {Promise<Object>} Updated note
 */
export async function updateNote(noteId, noteData) {
  const res = await fetch(`${API_URL}/api/notes/${noteId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(noteData),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || `HTTP ${res.status}`);
  }
  
  const json = await res.json();
  return json.data;
}

/**
 * Delete a note
 * @param {string} noteId - Note ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteNote(noteId) {
  const res = await fetch(`${API_URL}/api/notes/${noteId}`, {
    method: "DELETE",
    credentials: "include",
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || `HTTP ${res.status}`);
  }
  
  return true;
}
