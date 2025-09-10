// src/services/materials/materialsService.js
import { API_URL } from "../../config";

/**
 * Get materials for a meeting
 * @param {string} meetingId - Meeting ID
 * @returns {Promise<Array>} Array of materials
 */
export async function getMaterials(meetingId) {
  const res = await fetch(
    `${API_URL}/api/materials?meetingId=${encodeURIComponent(meetingId)}`,
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
 * Upload a new material
 * @param {Object} materialData - Material data including file
 * @returns {Promise<Object>} Created material
 */
export async function uploadMaterial(materialData) {
  const formData = new FormData();
  
  // Append all fields to FormData
  Object.keys(materialData).forEach(key => {
    if (materialData[key] !== null && materialData[key] !== undefined) {
      formData.append(key, materialData[key]);
    }
  });
  
  const res = await fetch(`${API_URL}/api/materials`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || `HTTP ${res.status}`);
  }
  
  const json = await res.json();
  return json.data;
}

/**
 * Update a material
 * @param {string} materialId - Material ID
 * @param {Object} materialData - Updated material data
 * @returns {Promise<Object>} Updated material
 */
export async function updateMaterial(materialId, materialData) {
  const res = await fetch(`${API_URL}/api/materials/${materialId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(materialData),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || `HTTP ${res.status}`);
  }
  
  const json = await res.json();
  return json.data;
}

/**
 * Delete a material
 * @param {string} materialId - Material ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteMaterial(materialId) {
  const res = await fetch(`${API_URL}/api/materials/${materialId}`, {
    method: "DELETE",
    credentials: "include",
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || `HTTP ${res.status}`);
  }
  
  return true;
}
