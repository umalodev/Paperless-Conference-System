import { useState, useCallback } from "react";
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";

export function useNoteEdit({ notify, confirm }) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = useCallback((note) => {
    setEditingId(note.id);
    setEditTitle(note.title || "");
    setEditBody(note.body || "");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditTitle("");
    setEditBody("");
  }, []);

  const saveEdit = useCallback(
    async (setNotes) => {
      if (!editingId) return;
      setSaving(true);
      try {
        const payload = { title: editTitle.trim(), body: editBody.trim() };
        const res = await fetch(`${API_URL}/api/notes/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...meetingService.getAuthHeaders(),
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const updated = json.data;
        setNotes?.((prev) => prev.map((x) => (x.id === editingId ? updated : x)));
        cancelEdit();
        notify?.({
          variant: "success",
          title: "Success",
          message: "Note has been successfully saved",
          autoCloseMs: 3000,
        });
      } catch (e) {
        notify?.({
          variant: "error",
          title: "Gagal Menyimpan",
          message: e.message || String(e),
          autoCloseMs: 5000,
        });
      } finally {
        setSaving(false);
      }
    },
    [editingId, editTitle, editBody, notify, cancelEdit]
  );

  const handleDelete = useCallback(
    async (id, setNotes) => {
      const confirmed = await confirm?.({
        title: "Hapus Catatan?",
        message:
          "Catatan ini akan dihapus dari meeting. Tindakan ini tidak dapat dibatalkan.",
        destructive: true,
        okText: "Hapus",
        cancelText: "Batal",
      });
      if (!confirmed) return;

      setSaving(true);
      try {
        const res = await fetch(`${API_URL}/api/notes/${id}`, {
          method: "DELETE",
          headers: meetingService.getAuthHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setNotes?.((prev) => prev.filter((x) => x.id !== id));
        notify?.({
          variant: "success",
          title: "Success",
          message: "Note has been successfully deleted",
          autoCloseMs: 3000,
        });
      } catch (e) {
        notify?.({
          variant: "error",
          title: "Failed to Delete",
          message: e.message || String(e),
          autoCloseMs: 5000,
        });
      } finally {
        setSaving(false);
      }
    },
    [confirm, notify]
  );

  return {
    editingId,
    editTitle,
    editBody,
    saving,
    setEditTitle,
    setEditBody,
    startEdit,
    cancelEdit,
    saveEdit,
    handleDelete,
  };
}
