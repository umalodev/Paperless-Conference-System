// src/features/survey/services/surveyService.js
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";

/**
 * Get all surveys for a given meeting
 */
export async function getSurveysByMeeting(meetingId) {
  const res = await fetch(`${API_URL}/api/surveys/meeting/${meetingId}`, {
    headers: meetingService.getAuthHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch surveys: ${res.status}`);
  const json = await res.json();
  return json?.data || [];
}

/**
 * Create a new survey for a meeting
 */
export async function createSurvey(payload) {
  const res = await fetch(`${API_URL}/api/surveys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...meetingService.getAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create survey: ${res.status}`);
  const json = await res.json();
  return json?.data;
}

/**
 * Update survey by ID
 */
export async function updateSurvey(surveyId, payload) {
  const res = await fetch(`${API_URL}/api/surveys/${surveyId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...meetingService.getAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update survey: ${res.status}`);
  const json = await res.json();
  return json?.data;
}

/**
 * Delete survey by ID
 */
export async function deleteSurvey(surveyId) {
  const res = await fetch(`${API_URL}/api/surveys/${surveyId}`, {
    method: "DELETE",
    headers: meetingService.getAuthHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to delete survey: ${res.status}`);
  return true;
}

/**
 * Toggle survey visibility (Y/N)
 */
export async function toggleVisibility(surveyId, flag) {
  const res = await fetch(`${API_URL}/api/surveys/${surveyId}/visibility`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...meetingService.getAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({ isShow: flag }),
  });
  if (!res.ok) throw new Error(`Failed to update visibility: ${res.status}`);
  return true;
}

/**
 * List available survey question types
 */
export async function listTypes() {
  const res = await fetch(`${API_URL}/api/surveys/types`, {
    headers: meetingService.getAuthHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch question types: ${res.status}`);
  const json = await res.json();
  return json?.data || [];
}

/**
 * Get responses of a survey
 */
export async function getResponses(surveyId) {
  const res = await fetch(`${API_URL}/api/surveys/${surveyId}/responses`, {
    headers: meetingService.getAuthHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch responses: ${res.status}`);
  const json = await res.json();
  return json?.data || { questions: [], responses: [] };
}

/**
 * Get multiple choice statistics
 */
export async function getMcStats(surveyId) {
  const res = await fetch(`${API_URL}/api/surveys/${surveyId}/mc-stats`, {
    headers: meetingService.getAuthHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch MC stats: ${res.status}`);
  const json = await res.json();
  return json?.data || [];
}

/**
 * Download CSV file for survey responses
 */
export async function downloadResponsesCSV(surveyId) {
  const res = await fetch(`${API_URL}/api/surveys/${surveyId}/responses/csv`, {
    headers: meetingService.getAuthHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to download CSV: ${res.status}`);
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `survey_${surveyId}_responses.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Get my own previous survey response
 */
export async function getMyResponse(surveyId) {
  const res = await fetch(`${API_URL}/api/surveys/${surveyId}/my-response`, {
    headers: meetingService.getAuthHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch my response: ${res.status}`);
  const json = await res.json();
  return json?.data || null;
}

/**
 * Submit my survey responses
 */
export async function submitResponses(payload) {
  const res = await fetch(`${API_URL}/api/surveys/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...meetingService.getAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to submit responses: ${res.status}`);
  const json = await res.json();
  return json?.data;
}
