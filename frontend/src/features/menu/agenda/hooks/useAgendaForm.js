import { useState } from "react";
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService.js";

export default function useAgendaForm(meetingId, { loadAgendas, notify, confirm, refreshUnread }) {
  const [form, setForm] = useState({
    judul: "",
    deskripsi: "",
    date: "",
    start: "",
    end: "",
  });

  const [formErr, setFormErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState(null);

  // 🔁 Reset form
  const resetForm = () =>
    setForm({ judul: "", deskripsi: "", date: "", start: "", end: "" });

  // ✏️ Handle input
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  // 🟢 Open Add Form
  const openAdd = () => {
    resetForm();
    setShowAdd(true);
    setShowEdit(false);
    setEditing(null);
  };

  // 🔴 Close Add Form
  const closeAdd = () => setShowAdd(false);

  // 🟣 Open Edit Form
  const openEdit = (agenda) => {
    const startDate = agenda.start ? agenda.start.split("T")[0] : "";
    const startTime = agenda.start ? agenda.start.split("T")[1]?.slice(0, 5) : "";
    const endTime = agenda.end ? agenda.end.split("T")[1]?.slice(0, 5) : "";

    setForm({
      id: agenda.id, // ✅ tambahkan ini
      judul: agenda.title || "",
      deskripsi: agenda.desc || "",
      date: startDate,
      start: startTime,
      end: endTime,
    });
    setEditing(agenda.id);
    setShowEdit(true);
    setShowAdd(false);
  };



  const closeEdit = () => {
    setShowEdit(false);
    setEditing(null);
  };

  // 💾 Submit Add
  const submitAdd = async (e) => {
    e.preventDefault();
    setFormErr("");
    if (!meetingId) return setFormErr("Meeting belum ada.");
    if (!form.judul.trim()) return setFormErr("Judul wajib diisi.");

    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/api/agendas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
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
      await refreshUnread();
      notify({
        variant: "success",
        title: "Agenda Saved",
        message: "Agenda added successfully.",
      });

      resetForm();
      setShowAdd(false);
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  // 💾 Submit Edit (belum dipakai tapi siap)
  const submitEdit = async (id) => {
    if (!id) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/api/agendas/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await loadAgendas();
      notify({
        variant: "success",
        title: "Agenda Updated",
        message: "Agenda updated successfully.",
      });
      closeEdit();
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    formErr,
    saving,
    showAdd,
    showEdit,
    editing,
    handleFormChange,
    openAdd,
    closeAdd,
    openEdit,
    closeEdit,
    submitAdd,
    submitEdit,
  };
}
