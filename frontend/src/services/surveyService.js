// src/services/surveyService.js
import { API_URL } from "../config.js";

function authHeader() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function http(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
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

/* kamus tipe */
export async function listTypes() {
  const json = await http(`/api/surveys/types`);
  return json?.data ?? [];
}

/* survey */
export async function getSurveysByMeeting(meetingId) {
  const json = await http(
    `/api/surveys/meeting/${encodeURIComponent(meetingId)}`
  );
  return Array.isArray(json?.data) ? json.data : [];
}
export async function getSurveyById(surveyId) {
  const json = await http(`/api/surveys/${surveyId}`);
  return json?.data ?? null;
}
export async function createSurvey(payload) {
  // payload: { meetingId, title, description, isShow, questions:[{typeName,questionBody,isRequired,seq,options:[{optionBody,seq}]}] }
  const json = await http(`/api/surveys`, { method: "POST", body: payload });
  return json?.data ?? null;
}
export async function updateSurvey(surveyId, payload) {
  const json = await http(`/api/surveys/${surveyId}`, {
    method: "PUT",
    body: payload,
  });
  return json;
}
export async function deleteSurvey(surveyId) {
  const json = await http(`/api/surveys/${surveyId}`, { method: "DELETE" });
  return json;
}
export async function toggleVisibility(surveyId, isShow /* 'Y'|'N' */) {
  const json = await http(`/api/surveys/${surveyId}/visibility`, {
    method: "PATCH",
    body: { isShow },
  });
  return json;
}

/* responses */
export async function submitResponses({ surveyId, meetingId, responses }) {
  // responses: [{ questionId, value }]
  const json = await http(`/api/surveys/${surveyId}/responses`, {
    method: "POST",
    body: { meetingId, responses },
  });
  return json?.data ?? null;
}
export async function getMyResponse(surveyId) {
  const json = await http(`/api/surveys/${surveyId}/responses/me`);
  return json?.data ?? null;
}
