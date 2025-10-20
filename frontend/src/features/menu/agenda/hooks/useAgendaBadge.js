// src/features/agenda/hooks/useAgendaBadge.js
import { useState, useCallback } from "react";
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";

/**
 * Hook untuk handle badge unread agenda dan mark-all-read.
 */
export default function useAgendaBadge(meetingId) {
  const [badgeCount, setBadgeCount] = useState(0);

  // Fetch unread count
  const refreshUnread = useCallback(async () => {
    try {
      const url = new URL(`${API_URL}/api/agendas/unread-count`);
      if (meetingId) url.searchParams.set("meetingId", String(meetingId));

      const res = await fetch(url.toString(), {
        headers: meetingService.getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const unread = json?.data?.unread ?? 0;
      setBadgeCount(unread);
      return unread;
    } catch {
      setBadgeCount(0);
    }
  }, [meetingId]);

  // Mark all as read
  const markAllRead = useCallback(async () => {
    try {
      const body = {};
      if (meetingId) body.meetingId = meetingId;
      await fetch(`${API_URL}/api/agendas/mark-all-read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
        body: JSON.stringify(body),
      });
      setBadgeCount(0);
      localStorage.setItem("badge.map", JSON.stringify({ agenda: 0 }));
      window.dispatchEvent(new Event("badge:changed"));
    } catch {
      /* ignore */
    }
  }, [meetingId]);

  return { badgeCount, refreshUnread, markAllRead };
}
