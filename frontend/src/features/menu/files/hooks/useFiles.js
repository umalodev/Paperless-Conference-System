// src/features/menu/files/hooks/useFiles.js
import { useState, useCallback, useEffect } from "react";
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";
import { listFiles, uploadFile, deleteFile } from "../../../../services/filesService.js";

export default function useFiles({ meetingId, notify, confirm, setBadgeLocal }) {
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [errFiles, setErrFiles] = useState("");
  const [uploading, setUploading] = useState(false);

  const loadFiles = useCallback(async () => {
    try {
      if (!meetingId) {
        setFiles([]);
        setLoadingFiles(false);
        return;
      }
      setLoadingFiles(true);
      setErrFiles("");
      const data = await listFiles(meetingId);
      setFiles(data);

      // Mark all read
      await fetch(`${API_URL}/api/files/mark-all-read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
        body: JSON.stringify({ meetingId }),
      });
      setBadgeLocal?.("files", 0);
    } catch (e) {
      setErrFiles(String(e.message || e));
    } finally {
      setLoadingFiles(false);
    }
  }, [meetingId, setBadgeLocal]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = useCallback(
    async (file) => {
      if (!file || !meetingId) return;
      setUploading(true);
      try {
        const created = await uploadFile({ meetingId, file });
        setFiles((prev) => [created, ...prev]);

        // tandai read
        try {
          await fetch(`${API_URL}/api/files/${created.fileId}/read`, {
            method: "PATCH",
            headers: meetingService.getAuthHeaders(),
          });
        } catch {}

        setBadgeLocal?.("files", 0);
        notify?.({
          variant: "success",
          title: "Success",
          message: "File successfully uploaded",
          autoCloseMs: 3000,
        });
      } catch (e) {
        notify?.({
          variant: "error",
          title: "Upload Failed",
          message: e.message || String(e),
          autoCloseMs: 5000,
        });
      } finally {
        setUploading(false);
      }
    },
    [meetingId, notify, setBadgeLocal]
  );

  const handleDelete = useCallback(
    async (fileId) => {
      const confirmed = await confirm?.({
        title: "Delete File?",
        message:
          "This file will be deleted from the meeting. This action cannot be undone.",
        destructive: true,
        okText: "Delete",
        cancelText: "Cancel",
      });
      if (!confirmed) return;

      try {
        await deleteFile(fileId);
        setFiles((prev) => prev.filter((x) => x.fileId !== fileId));
        notify?.({
          variant: "success",
          title: "Success",
          message: "File deleted",
          autoCloseMs: 3000,
        });
      } catch (e) {
        notify?.({
          variant: "error",
          title: "Failed to Delete",
          message: e.message || String(e),
          autoCloseMs: 5000,
        });
      }
    },
    [confirm, notify]
  );

  

  return {
    files,
    setFiles,
    loadingFiles,
    errFiles,
    uploading,
    loadFiles,
    handleUpload,
    handleDelete,
  };
}
