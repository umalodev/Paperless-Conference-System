// src/features/agenda/hooks/useAgendaForm.js
import { useState } from "react";
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";

export default function useAgendaForm(meetingId, { loadAgendas, notify, confirm, refreshUnread }) {
  const [form, setForm] = useState({ judul: "", deskripsi: "", date: "", start: "", end: "" });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  const resetForm = () => setForm({ judul: "", deskripsi: "", date: "", start: "", end: "" });

  const handleFormChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const submitAdd = async () => {
    if (!meetingId) return setFormErr("Meeting belum ada.");
    if (!form.judul.trim()) return setFormErr("Title is required.");
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/api/agendas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...meetingService.getAuthHeaders() },
        body: JSON.stringify({
          meetingId,
          judul: form.judul.trim(),
          deskripsi: form.deskripsi || null,
          start_time: `${form.date}T${form.start}`,
          end_time: `${form.date}T${form.end}`,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadAgendas();
      await notify({ variant: "success", title: "Agenda Saved", message: "Agenda added." });
      await refreshUnread();
      resetForm();
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (id) => { /* mirip tapi pakai PUT */ };

  return {
    form, setForm, editing, setEditing, saving, formErr,
    handleFormChange, submitAdd, submitEdit, resetForm,
  };
}
