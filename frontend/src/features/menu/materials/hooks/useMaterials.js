// src/features/materials/hooks/useMaterials.js
import { useState, useCallback, useRef } from "react";
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";

/**
 * Hook untuk handle materials meeting aktif
 */
export default function useMaterials({ meetingId, notify, confirm }) {
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [errItems, setErrItems] = useState("");
  const [uploading, setUploading] = useState(false);

  // track mounted agar tidak setState setelah unmount
  const mountedRef = useRef(true);
  const safeSetState = useCallback((setter) => {
    if (mountedRef.current) setter();
  }, []);
  // cleanup
  // NOTE: hook ini tidak punya useEffect sendiri; mountedRef akan direset oleh komponen pemakai.

  // helper absolutize
  const absolutize = useCallback((u) => {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    const base = String(API_URL || "").replace(/\/+$/, "");
    const p = `/${String(u).replace(/^\/+/, "")}`;
    return `${base}${p}`;
  }, []);

  const guessName = useCallback((p = "") => {
    try {
      const s = p.split("?")[0];
      return s.split("/").pop() || "file";
    } catch {
      return "file";
    }
  }, []);

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

  // ===== LOAD =====
  const loadMaterials = useCallback(async () => {
    if (!meetingId) {
      safeSetState(() => setItems([]));
      safeSetState(() => setErrItems("Meeting belum dipilih/aktif"));
      safeSetState(() => setLoadingItems(false));
      return;
    }
    safeSetState(() => setLoadingItems(true));
    safeSetState(() => setErrItems(""));
    try {
      const res = await fetch(
        `${API_URL}/api/materials/meeting/${encodeURIComponent(meetingId)}`,
        { credentials: "include", headers: meetingService.getAuthHeaders() }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const arr = Array.isArray(json?.data) ? json.data : [];
      const list = arr.map((x) => ({
        id: x.id,
        path: x.path,
        url: absolutize(x.url || x.path),
        name: guessName(x.path),
        createdAt: x.createdAt || x.created_at,
      }));
      safeSetState(() => setItems(list));
      setBadgeLocal("materials", 0);
    } catch (e) {
      safeSetState(() => setErrItems(String(e.message || e)));
    } finally {
      safeSetState(() => setLoadingItems(false));
    }
  }, [meetingId, absolutize, guessName, setBadgeLocal, safeSetState]);

  // ===== UPLOAD =====
  const uploadFiles = useCallback(
    async (files) => {
      if (!files?.length) return;
      if (!meetingId) {
        notify?.({
          variant: "warning",
          title: "Meeting not active",
          message: "Please join/select a meeting before uploading materials.",
          autoCloseMs: 3000,
        });
        return;
      }

      safeSetState(() => setUploading(true));
      try {
        // auth headers tanpa Content-Type agar FormData di-set otomatis oleh browser
        const headers = { ...meetingService.getAuthHeaders() };
        if (headers["Content-Type"]) delete headers["Content-Type"];
        if (headers["content-type"]) delete headers["content-type"];

        const results = [];
        for (const f of files) {
          const fd = new FormData();
          // NOTE: backend kamu baca req.files atau req.file.
          // Pastikan middleware multer menerima field "file" (single/array/any).
          fd.append("file", f);

          const res = await fetch(
            `${API_URL}/api/materials/upload/${encodeURIComponent(meetingId)}`,
            {
              method: "POST",
              body: fd,
              credentials: "include",
              headers,
            }
          );

          // res.ok true untuk 2xx (termasuk 207). Kalau 4xx/5xx lempar error detail
          if (!res.ok) {
            let message = `Upload failed (HTTP ${res.status})`;
            try {
              const t = await res.json();
              message = t?.message || message;
            } catch {}
            throw new Error(message);
          }

          results.push(await res.json().catch(() => ({})));
        }

        await loadMaterials();

        // notif sukses (singkat)
        notify?.({
          variant: "success",
          title: "Success",
          message: `${
            files.length > 1 ? `${files.length} files` : "File"
          } successfully uploaded`,
          autoCloseMs: 3000,
        });

        return results;
      } catch (err) {
        notify?.({
          variant: "error",
          title: "Upload Failed",
          message: err?.message || String(err),
          autoCloseMs: 5000,
        });
        throw err;
      } finally {
        safeSetState(() => setUploading(false));
      }
    },
    [meetingId, notify, loadMaterials, safeSetState]
  );

  // ===== DELETE =====
  const deleteMaterial = useCallback(
    async (it) => {
      const confirmed = await confirm?.({
        title: "Delete Material?",
        message:
          "This material will be deleted from the meeting. This action cannot be undone.",
        destructive: true,
        okText: "Delete",
        cancelText: "Cancel",
      });
      if (!confirmed) return;
      try {
        const res = await fetch(`${API_URL}/api/materials/${it.id}`, {
          method: "DELETE",
          credentials: "include",
          headers: meetingService.getAuthHeaders(),
        });
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            const t = await res.json();
            msg = t?.message || msg;
          } catch {}
          throw new Error(msg);
        }
        await loadMaterials();
        notify?.({
          variant: "success",
          title: "Success",
          message: `Material "${it.name}" has been successfully deleted`,
          autoCloseMs: 3000,
        });
      } catch (e) {
        notify?.({
          variant: "error",
          title: "Delete Failed",
          message: e?.message || String(e),
          autoCloseMs: 5000,
        });
      }
    },
    [confirm, notify, loadMaterials]
  );

  return {
    items,
    loadingItems,
    errItems,
    uploading,
    loadMaterials,
    uploadFiles,
    deleteMaterial,
  };
}
