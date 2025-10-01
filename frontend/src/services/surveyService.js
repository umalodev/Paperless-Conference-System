// src/services/surveyService.js
import { API_URL } from "../config.js";

/* ===== Auth helper sederhana ===== */
function authHeader() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/* ===== HTTP helper (JSON) ===== */
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
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg = json?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json || {};
}

/* ===== KAMUS TIPE ===== */
export async function listTypes() {
  const json = await http(`/api/surveys/types`);
  return json?.data ?? [];
}

/* ===== SURVEY CRUD ===== */
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
  // payload: { meetingId, title, description, isShow, questions:[...] }
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

/* ===== RESPON PESERTA ===== */
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

/* ===== RESPON UNTUK HOST ===== */
export async function getResponses(surveyId) {
  const json = await http(`/api/surveys/${surveyId}/responses`, {
    method: "GET",
  });
  // bentuk: { questions, responses }
  return json?.data ?? { questions: [], responses: [] };
}

export async function downloadResponsesCSV(surveyId, filename) {
  const res = await fetch(`${API_URL}/api/surveys/${surveyId}/responses.csv`, {
    headers: { ...authHeader() },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `survey-${surveyId}-responses.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
