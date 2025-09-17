// src/pages/menu/survey/components/SurveyEditor.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * Props:
 * - initialSurvey: { surveyId?, title, description, isShow: 'Y'|'N', questions: [...] } | null
 * - meetingId: string|number
 * - onSave(payload) : Promise|void
 * - onCancel() : void
 * - saving: boolean
 */

export default function SurveyEditor({
  initialSurvey = null,
  meetingId,
  onSave,
  onCancel,
  saving = false,
}) {
  // ==== Helpers ====
  const uid = () => Math.random().toString(36).slice(2, 10);

  const toBoolYN = (v) => (v === "Y" || v === true);
  const toYN = (v) => (v ? "Y" : "N");

  const normalizeQuestion = (q, index = 0) => {
    // Terima berbagai kemungkinan bentuk dari backend lama
    const typeRaw =
      q?.type || q?.questionType || q?.kind || q?.typeCode || "short_text";
    const mapType = {
      short_text: "short_text",
      long_text: "long_text",
      single_choice: "single_choice",
      multi_choice: "multi_choice",
      rating: "rating",
      text: "short_text",
      textarea: "long_text",
      radio: "single_choice",
      checkbox: "multi_choice",
      scale: "rating",
    };
    const type = mapType[typeRaw] || "short_text";

    const text = q?.text || q?.title || q?.label || "";
    const options =
      (Array.isArray(q?.options) && q.options) ||
      (Array.isArray(q?.choices) && q.choices) ||
      [];

    return {
      cid: uid(), // client id
      questionId: q?.questionId || q?.id || null, // biar update bisa deteksi
      type,
      text,
      required: toBoolYN(q?.required),
      options: options.map((o) => String(o ?? "")),
      max: Number(q?.max || q?.maxRating || 5) || 5,
      order: typeof q?.order === "number" ? q.order : index,
    };
  };

  // ==== State ====
  const [title, setTitle] = useState(initialSurvey?.title || "");
  const [description, setDescription] = useState(
    initialSurvey?.description || ""
  );
  const [isShow, setIsShow] = useState(toBoolYN(initialSurvey?.isShow));
  const [questions, setQuestions] = useState(
    Array.isArray(initialSurvey?.questions)
      ? initialSurvey.questions.map(normalizeQuestion)
      : []
  );
  const [error, setError] = useState("");

  useEffect(() => {
    // reset jika initialSurvey berubah
    setTitle(initialSurvey?.title || "");
    setDescription(initialSurvey?.description || "");
    setIsShow(toBoolYN(initialSurvey?.isShow));
    setQuestions(
      Array.isArray(initialSurvey?.questions)
        ? initialSurvey.questions.map(normalizeQuestion)
        : []
    );
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSurvey?.surveyId]);

  // ==== Actions (Question CRUD) ====
  const addQuestion = (type) => {
    const base = {
      cid: uid(),
      questionId: null,
      type,
      text: "",
      required: false,
      options: [],
      max: 5,
      order: questions.length,
    };
    if (type === "single_choice" || type === "multi_choice") {
      base.options = ["Opsi 1", "Opsi 2"];
    }
    if (type === "rating") base.max = 5;
    setQuestions((q) => [...q, base]);
  };

  const updateQuestion = (cid, patch) => {
    setQuestions((arr) =>
      arr.map((q) => (q.cid === cid ? { ...q, ...patch } : q))
    );
  };

  const duplicateQuestion = (cid) => {
    setQuestions((arr) => {
      const idx = arr.findIndex((q) => q.cid === cid);
      if (idx < 0) return arr;
      const copy = {
        ...arr[idx],
        cid: uid(),
        questionId: null,
        order: arr.length,
      };
      return [...arr.slice(0, idx + 1), copy, ...arr.slice(idx + 1)];
    });
  };

  const removeQuestion = (cid) =>
    setQuestions((arr) => arr.filter((q) => q.cid !== cid));

  const moveQuestion = (cid, dir) => {
    setQuestions((arr) => {
      const idx = arr.findIndex((x) => x.cid === cid);
      if (idx < 0) return arr;
      const swapWith = dir === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= arr.length) return arr;
      const clone = [...arr];
      [clone[idx], clone[swapWith]] = [clone[swapWith], clone[idx]];
      return clone.map((q, i) => ({ ...q, order: i }));
    });
  };

  // options editor
  const addOption = (cid) =>
    updateQuestion(cid, {
      options: [
        ...(questions.find((q) => q.cid === cid)?.options || []),
        `Opsi ${((questions.find((q) => q.cid === cid)?.options || []).length ||
          0) + 1}`,
      ],
    });
  const updateOption = (cid, i, val) =>
    setQuestions((arr) =>
      arr.map((q) =>
        q.cid === cid
          ? {
              ...q,
              options: q.options.map((o, idx) => (idx === i ? val : o)),
            }
          : q
      )
    );
  const removeOption = (cid, i) =>
    setQuestions((arr) =>
      arr.map((q) =>
        q.cid === cid
          ? { ...q, options: q.options.filter((_, idx) => idx !== i) }
          : q
      )
    );

  // ==== Validation & Submit ====
  const validate = () => {
    if (!title.trim()) return "Judul survey wajib diisi.";
    if (questions.length === 0) return "Minimal buat 1 pertanyaan.";
    for (const q of questions) {
      if (!q.text.trim()) return "Ada pertanyaan yang masih kosong.";
      if (
        (q.type === "single_choice" || q.type === "multi_choice") &&
        (q.options.length < 2 ||
          q.options.some((o) => !String(o).trim()))
      ) {
        return "Pertanyaan pilihan harus punya minimal 2 opsi dan tidak boleh kosong.";
      }
      if (q.type === "rating") {
        if (q.max < 2 || q.max > 10) return "Rating harus di rentang 2–10.";
      }
    }
    return "";
  };

  const handleSave = async () => {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    const payload = {
      meetingId,
      title: title.trim(),
      description: description.trim(),
      isShow: toYN(isShow),
      questions: questions.map((q, i) => ({
        // kirim questionId jika mengedit pertanyaan lama
        questionId: q.questionId || undefined,
        type: q.type,
        text: q.text.trim(),
        required: toYN(!!q.required),
        options:
          q.type === "single_choice" || q.type === "multi_choice"
            ? q.options.map((o) => String(o).trim())
            : [],
        max: q.type === "rating" ? Number(q.max) : undefined,
        order: i,
      })),
    };
    setError("");
    await Promise.resolve(onSave?.(payload));
  };

  // ==== UI ====
  return (
    <div className="svr-item">
      <div className="svr-qtext" style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <PencilIcon />
        <span>Kelola Survey</span>
      </div>

      {/* Title */}
      <Field label="Judul Survey" hint="Contoh: Survey Kepuasan Peserta Meeting">
        <input
          className="svr-text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Contoh: Survey Kepuasan Peserta Meeting"
        />
      </Field>

      {/* Description */}
      <Field label="Deskripsi (Opsional)">
        <textarea
          className="svr-text"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Jelaskan tujuan survey ini kepada peserta…"
        />
      </Field>

      {/* isShow */}
      <div
        className="svr-opt"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#fff",
        }}
      >
        <input
          id="isShow"
          type="checkbox"
          checked={isShow}
          onChange={(e) => setIsShow(e.target.checked)}
        />
        <label htmlFor="isShow" style={{ cursor: "pointer" }}>
          Tampilkan ke peserta {isShow ? "(aktif)" : "(nonaktif)"}
        </label>
      </div>

      {/* Questions */}
      <div style={{ marginTop: 16 }}>
        <div className="svr-qtext" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <QuestionIcon />
          <span>Pertanyaan</span>
        </div>

        {questions.map((q, idx) => (
          <div key={q.cid} className="svr-item" style={{ background: "#fff" }}>
            {/* Header controls */}
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginBottom: 10,
                flexWrap: "wrap",
              }}
            >
              <select
                className="svr-text"
                value={q.type}
                onChange={(e) => updateQuestion(q.cid, { type: e.target.value })}
                style={{ maxWidth: 220 }}
              >
                <option value="short_text">Teks Singkat</option>
                <option value="long_text">Teks Panjang</option>
                <option value="single_choice">Pilihan Tunggal</option>
                <option value="multi_choice">Pilihan Ganda</option>
                <option value="rating">Rating (1–10)</option>
              </select>

              <div style={{ display: "inline-flex", gap: 8, marginLeft: "auto" }}>
                <IconButton title="Naikkan" onClick={() => moveQuestion(q.cid, "up")} disabled={idx === 0}>
                  <UpIcon />
                </IconButton>
                <IconButton
                  title="Turunkan"
                  onClick={() => moveQuestion(q.cid, "down")}
                  disabled={idx === questions.length - 1}
                >
                  <DownIcon />
                </IconButton>
                <IconButton title="Duplikasi" onClick={() => duplicateQuestion(q.cid)}>
                  <CopyIcon />
                </IconButton>
                <IconButton title="Hapus" onClick={() => removeQuestion(q.cid)}>
                  <TrashIcon />
                </IconButton>
              </div>
            </div>

            {/* Question text */}
            <input
              className="svr-text"
              value={q.text}
              onChange={(e) => updateQuestion(q.cid, { text: e.target.value })}
              placeholder="Tulis pertanyaan…"
            />

            {/* Body by type */}
            {(q.type === "single_choice" || q.type === "multi_choice") && (
              <div className="svr-options" style={{ marginTop: 10 }}>
                {q.options.map((opt, i) => (
                  <div className="svr-opt" key={i} style={{ background: "#fff" }}>
                    {q.type === "single_choice" ? (
                      <input type="radio" disabled />
                    ) : (
                      <input type="checkbox" disabled />
                    )}
                    <input
                      className="svr-text"
                      value={opt}
                      onChange={(e) => updateOption(q.cid, i, e.target.value)}
                      placeholder={`Opsi ${i + 1}`}
                    />
                    <IconButton title="Hapus opsi" onClick={() => removeOption(q.cid, i)}>
                      <TrashIcon />
                    </IconButton>
                  </div>
                ))}
                <button className="svr-btn" onClick={() => addOption(q.cid)} type="button">
                  <PlusIcon />
                  <span>Tambah Opsi</span>
                </button>
              </div>
            )}

            {q.type === "rating" && (
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span>Skala maks:</span>
                <input
                  className="svr-text"
                  type="number"
                  min={2}
                  max={10}
                  step={1}
                  value={q.max}
                  onChange={(e) =>
                    updateQuestion(q.cid, { max: Math.max(2, Math.min(10, Number(e.target.value) || 5)) })
                  }
                  style={{ width: 90 }}
                />
              </div>
            )}

            {q.type === "long_text" && (
              <textarea
                className="svr-text"
                rows={3}
                placeholder="Jawaban panjang…"
                disabled
                style={{ marginTop: 8 }}
              />
            )}
            {q.type === "short_text" && (
              <input
                className="svr-text"
                placeholder="Jawaban singkat…"
                disabled
                style={{ marginTop: 8 }}
              />
            )}

            {/* required toggle */}
            <div className="svr-opt" style={{ marginTop: 10, background: "#fff" }}>
              <input
                id={`req-${q.cid}`}
                type="checkbox"
                checked={!!q.required}
                onChange={(e) => updateQuestion(q.cid, { required: e.target.checked })}
              />
              <label htmlFor={`req-${q.cid}`} style={{ cursor: "pointer" }}>
                Wajib diisi
              </label>
            </div>
          </div>
        ))}

        {/* Add bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 8,
            marginTop: 10,
          }}
        >
          <button className="svr-btn" onClick={() => addQuestion("short_text")} type="button">
            <PlusIcon />
            <span>Teks Singkat</span>
          </button>
          <button className="svr-btn" onClick={() => addQuestion("long_text")} type="button">
            <PlusIcon />
            <span>Teks Panjang</span>
          </button>
          <button className="svr-btn" onClick={() => addQuestion("single_choice")} type="button">
            <PlusIcon />
            <span>Pilihan Tunggal</span>
          </button>
          <button className="svr-btn" onClick={() => addQuestion("multi_choice")} type="button">
            <PlusIcon />
            <span>Pilihan Ganda</span>
          </button>
          <button className="svr-btn" onClick={() => addQuestion("rating")} type="button">
            <PlusIcon />
            <span>Rating</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div className="svr-msg err" role="alert">{error}</div>}

      {/* Actions */}
      <div className="svr-actions">
        <button className="svr-btn" type="button" onClick={onCancel} disabled={saving}>
          <CloseIcon />
          <span>Batal</span>
        </button>
        <button className="svr-submit" type="button" onClick={handleSave} disabled={saving}>
          <SaveIcon />
          <span>{saving ? "Menyimpan…" : "Simpan Survey"}</span>
        </button>
      </div>
    </div>
  );
}

/* ========= Small reusable pieces ========= */

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      {label && (
        <div style={{ fontSize: 13, fontWeight: 700, margin: "0 0 6px", display: "flex", gap: 6, alignItems: "center" }}>
          <DotIcon />
          <span>{label}</span>
        </div>
      )}
      {children}
      {hint && (
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{hint}</div>
      )}
    </div>
  );
}

function IconButton({ children, onClick, title, disabled }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="svr-btn"
      style={{
        padding: "6px 10px",
        borderRadius: 10,
        display: "inline-grid",
        gridAutoFlow: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span className="pd-svg" style={{ width: 16, height: 16, display: "inline-block" }}>
        {children}
      </span>
    </button>
  );
}

/* ========= Inline SVG icons (satu sumber, tidak dobel) ========= */

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
function QuestionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
function UpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  );
}
function DownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14" />
      <path d="M19 12l-7 7-7-7" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21V9H7v12" />
      <path d="M7 3v6h8" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
function DotIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}
