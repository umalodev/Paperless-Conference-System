// src/services/survey/surveyService.js
import { API_URL } from "../../config";

/**
 * HTTP helper function
 * @param {string} path - API path
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
async function http(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  let json = null;
  try {
    json = await res.json();
  } catch {}
  
  if (!res.ok) {
    const msg = json?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  
  return json;
}

/**
 * Get survey types
 * @returns {Promise<Array>} Array of survey types
 */
export async function getSurveyTypes() {
  const json = await http(`/api/surveys/types`);
  return json?.data ?? [];
}

/**
 * Get surveys by meeting ID
 * @param {string} meetingId - Meeting ID
 * @returns {Promise<Array>} Array of surveys
 */
export async function getSurveysByMeeting(meetingId) {
  const json = await http(
    `/api/surveys/meeting/${encodeURIComponent(meetingId)}`
  );
  return Array.isArray(json?.data) ? json.data : [];
}

/**
 * Get survey by ID
 * @param {string} surveyId - Survey ID
 * @returns {Promise<Object>} Survey data
 */
export async function getSurveyById(surveyId) {
  const json = await http(`/api/surveys/${surveyId}`);
  return json?.data ?? null;
}

/**
 * Create a new survey
 * @param {Object} payload - Survey data
 * @returns {Promise<Object>} Created survey
 */
export async function createSurvey(payload) {
  // payload: { meetingId, title, description, isShow, questions:[{typeName,questionBody,isRequired,seq,options:[{optionBody,seq}]}] }
  const json = await http(`/api/surveys`, { method: "POST", body: payload });
  return json?.data ?? null;
}

/**
 * Update a survey
 * @param {string} surveyId - Survey ID
 * @param {Object} payload - Updated survey data
 * @returns {Promise<Object>} Updated survey
 */
export async function updateSurvey(surveyId, payload) {
  const json = await http(`/api/surveys/${surveyId}`, {
    method: "PUT",
    body: payload,
  });
  return json;
}

/**
 * Delete a survey
 * @param {string} surveyId - Survey ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteSurvey(surveyId) {
  const json = await http(`/api/surveys/${surveyId}`, { method: "DELETE" });
  return json;
}

/**
 * Toggle survey visibility
 * @param {string} surveyId - Survey ID
 * @param {string} isShow - 'Y' or 'N'
 * @returns {Promise<Object>} Update result
 */
export async function toggleSurveyVisibility(surveyId, isShow) {
  const json = await http(`/api/surveys/${surveyId}/visibility`, {
    method: "PATCH",
    body: { isShow },
  });
  return json;
}

/**
 * Submit survey responses
 * @param {Object} responseData - Response data
 * @returns {Promise<Object>} Submission result
 */
export async function submitSurveyResponses({ surveyId, meetingId, responses }) {
  // responses: [{ questionId, value }]
  const json = await http(`/api/surveys/${surveyId}/responses`, {
    method: "POST",
    body: { meetingId, responses },
  });
  return json?.data ?? null;
}

/**
 * Get my response to a survey
 * @param {string} surveyId - Survey ID
 * @returns {Promise<Object>} My response data
 */
export async function getMySurveyResponse(surveyId) {
  const json = await http(`/api/surveys/${surveyId}/responses/me`);
  return json?.data ?? null;
}
