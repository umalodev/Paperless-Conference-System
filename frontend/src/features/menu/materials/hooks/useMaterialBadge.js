import { useState, useCallback } from "react";
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";

/**
 * Hook untuk handle badge, history toggle, dan mark-all-read
 */
export default function useMaterialBadge({ meetingId }) {
  const [showHistory, setShowHistory] = useState(false);

  // Toggle tampilan history
  const toggleHistory = useCallback(() => {
    setShowHistory((s) => !s);
  }, []);

  // Fungsi untuk set badge secara lokal
  const setBadgeLocal = useCallback((slug, value) => {
    try {
      const key = "badge.map";
      const raw = localStorage.getItem(key);
      const map = raw ? JSON.parse(raw) : {};
      map[slug] = value;
      localStorage.setItem(key, JSON.stringify(map));
      window.dispatchEvent(new Event("badge:changed"));
    } catch (err) {
      console.error("setBadgeLocal failed:", err);
    }
  }, []);

  // Fungsi untuk mark semua materials sebagai "read" di backend
  const markAllRead = useCallback(async () => {
    try {
      const body = {};
      if (meetingId) body.meetingId = meetingId;

      await fetch(`${API_URL}/api/materials/mark-all-read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
        body: JSON.stringify(body),
      });

      // Reset badge di localStorage
      setBadgeLocal("materials", 0);
    } catch (err) {
      console.warn("Failed to mark materials as read:", err);
    }
  }, [meetingId, setBadgeLocal]);

  return {
    showHistory,
    toggleHistory,
    markAllRead,
    setBadgeLocal, // ✅ pastikan dikembalikan di sini
  };
}
