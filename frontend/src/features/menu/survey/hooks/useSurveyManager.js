// src/features/survey/hooks/useSurveyManager.js
import { useState, useEffect, useMemo, useCallback } from "react";
import { API_URL } from "../../../../config.js";
import { useNavigate } from "react-router-dom";
import meetingService from "../../../../services/meetingService.js";
import {
  getSurveysByMeeting,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  toggleVisibility,
} from "../services";
import { useModal } from "../../../../contexts/ModalProvider.jsx";

/**
 * Hook untuk mengelola seluruh state dan aksi Survey.
 */
export default function useSurveyManager() {
  const [user, setUser] = useState(null);
  const { notify, confirm } = useModal();
  const navigate = useNavigate();

  // === state dasar ===
  const [displayName, setDisplayName] = useState("");
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");
  const [showResponses, setShowResponses] = useState(false);

  // === survey state ===
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [manageMode, setManageMode] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  // === meeting id ===
  const meetingId = useMemo(() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || null;
    } catch {
      return null;
    }
  }, []);

  // === initial load user & display name ===
  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    const dn = localStorage.getItem("pconf.displayName") || "";
    setDisplayName(dn);
  }, []);

  // === badge local helper ===
  const setBadgeLocal = useCallback((slug, value) => {
    try {
      const key = "badge.map";
      const raw = localStorage.getItem(key);
      const map = raw ? JSON.parse(raw) : {};
      map[slug] = value;
      localStorage.setItem(key, JSON.stringify(map));
      window.dispatchEvent(new Event("badge:changed"));
    } catch {}
  }, []);

  // === mark read on mount ===
  useEffect(() => {
    (async () => {
      try {
        if (!meetingId) return;
        await fetch(`${API_URL}/api/surveys/mark-all-read`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...meetingService.getAuthHeaders(),
          },
          credentials: "include",
          body: JSON.stringify({ meetingId }),
        });
        setBadgeLocal("survey", 0);
      } catch {
        /* noop */
      }
    })();
  }, [meetingId, setBadgeLocal]);

  // === load menus ===
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingMenus(true);
        setErrMenus("");
        const res = await fetch(`${API_URL}/api/menu/user/menus`, {
          headers: meetingService.getAuthHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = Array.isArray(json?.data)
          ? json.data.map((m) => ({
              menuId: m.menuId,
              slug: m.slug,
              label: m.displayLabel,
              flag: m.flag ?? "Y",
              iconUrl: m.iconMenu || null,
              seq: m.sequenceMenu,
            }))
          : [];
        if (!cancel) setMenus(list);
      } catch (e) {
        if (!cancel) setErrMenus(String(e.message || e));
      } finally {
        if (!cancel) setLoadingMenus(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // === load surveys ===
  const reload = useCallback(async () => {
    if (!meetingId) {
      setErr("Meeting belum aktif.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const list = await getSurveysByMeeting(meetingId);
      setSurveys(list);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // === computed values ===
  const isHost = /^(host|admin)$/i.test(user?.role || "");
  const visibleMenus = useMemo(
    () =>
      (menus || [])
        .filter((m) => (m?.flag ?? "Y") === "Y")
        .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999)),
    [menus]
  );
  const activeSurvey = useMemo(
    () => surveys.find((s) => (s.isShow || "N") === "Y") || null,
    [surveys]
  );

  // === actions ===
  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  const startCreate = () => setEditing({});
  const startEdit = (s) => setEditing(s);
  const cancelEdit = () => setEditing(null);

  const saveSurvey = async (payload) => {
    try {
      setSaving(true);
      if (editing?.surveyId) {
        await updateSurvey(editing.surveyId, payload);
        notify({
          variant: "success",
          title: "Success",
          message: "Survey successfully updated",
          autoCloseMs: 3000,
        });
      } else {
        await createSurvey(payload);
        notify({
          variant: "success",
          title: "Success",
          message: "Survey successfully created",
          autoCloseMs: 3000,
        });
      }
      setEditing(null);
      await reload();
    } catch (e) {
      notify({
        variant: "error",
        title: "Gagal Menyimpan",
        message: e.message || String(e),
        autoCloseMs: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const removeSurvey = async (s) => {
    if (!s?.surveyId) return;
    const confirmed = await confirm({
      title: "Delete Survey?",
      message: `This survey will be permanently deleted.`,
      destructive: true,
      okText: "Delete",
      cancelText: "Cancel",
    });
    if (!confirmed) return;
    try {
      await deleteSurvey(s.surveyId);
      await reload();
      notify({
        variant: "success",
        title: "Deleted",
        message: `Survey "${s.title || s.surveyId}" has been deleted.`,
        autoCloseMs: 3000,
      });
    } catch (e) {
      notify({
        variant: "error",
        title: "Gagal Menghapus",
        message: e.message || String(e),
        autoCloseMs: 5000,
      });
    }
  };

  const setActive = async (s, flag) => {
    try {
      await toggleVisibility(s.surveyId, flag ? "Y" : "N");
      await reload();
      notify({
        variant: "success",
        title: "Success",
        message: flag
          ? "Survey activated"
          : "Survey hidden",
        autoCloseMs: 3000,
      });
    } catch (e) {
      notify({
        variant: "error",
        title: "Gagal Mengubah Visibilitas",
        message: e.message || String(e),
        autoCloseMs: 5000,
      });
    }
  };

  return {
    // data
    user,
    displayName,
    isHost,
    meetingId,
    menus,
    visibleMenus,
    showResponses,
    surveys,
    activeSurvey,

    // state
    loading,
    err,
    manageMode,
    editing,
    saving,
    loadingMenus,
    errMenus,

    // setters
    setManageMode,
    setShowResponses,

    // actions
    handleSelectNav,
    startCreate,
    startEdit,
    cancelEdit,
    saveSurvey,
    removeSurvey,
    setActive,
    reload,
  };
}
