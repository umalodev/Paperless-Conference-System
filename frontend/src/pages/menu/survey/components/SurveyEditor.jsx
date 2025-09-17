import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../../../components/Icon.jsx";
import { listTypes } from "../../../../services/surveyService.js";

// util kecil
const NEEDS_OPTIONS = new Set(["multiple_choice", "checkbox"]);
const emptyQuestion = (typeName = "short_text") => ({
  _id: Math.random().toString(36).slice(2),
  typeName,
  questionBody: "",
  isRequired: false,
  options: NEEDS_OPTIONS.has(typeName)
    ? [
        { _id: cryptoRandom(), optionBody: "" },
        { _id: cryptoRandom(), optionBody: "" },
      ]
    : [],
});
function cryptoRandom() {
  try {
    return crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

export default function SurveyEditor({
  initialSurvey,
  meetingId,
  onCancel,
  onSave,
  saving,
}) {
  const init = initialSurvey || {};
  const initialQs = (init.Questions || [])
    .slice()
    .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
    .map((q) => ({
      _id: Math.random().toString(36).slice(2),
      typeName: (q.typeName || "").toLowerCase(),
      questionBody: q.questionBody || "",
      isRequired: q.isRequired === "Y",
      options: (q.Options || [])
        .slice()
        .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
        .map((o) => ({
          _id: Math.random().toString(36).slice(2),
          optionBody: o.optionBody || "",
        })),
    }));

  const [title, setTitle] = useState(init.title || "");
  const [description, setDescription] = useState(init.description || "");
  const [isShow, setIsShow] = useState((init.isShow || "N") === "Y");
  const [questions, setQuestions] = useState(
    initialSurvey ? initialQs : [emptyQuestion()]
  );
  const [types, setTypes] = useState([]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const ts = await listTypes();
        if (!cancel)
          setTypes(
            ts.map((t) => (t.name || t.type_question_name || "").toLowerCase())
          );
      } catch {}
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const addQuestion = (typeName = "short_text") => {
    setQuestions((qs) => [...qs, emptyQuestion(typeName)]);
  };
  const removeQuestion = (qid) => {
    setQuestions((qs) => qs.filter((q) => q._id !== qid));
  };
  const move = (qid, dir) => {
    setQuestions((qs) => {
      const i = qs.findIndex((q) => q._id === qid);
      if (i < 0) return qs;
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= qs.length) return qs;
      const copy = qs.slice();
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
      return copy;
    });
  };
  const changeType = (qid, typeName) => {
    setQuestions((qs) =>
      qs.map((q) =>
        q._id === qid
          ? {
              ...q,
              typeName,
              options: NEEDS_OPTIONS.has(typeName)
                ? q.options?.length
                  ? q.options
                  : [
                      { _id: cryptoRandom(), optionBody: "" },
                      { _id: cryptoRandom(), optionBody: "" },
                    ]
                : [],
            }
          : q
      )
    );
  };
  const changeBody = (qid, v) =>
    setQuestions((qs) =>
      qs.map((q) => (q._id === qid ? { ...q, questionBody: v } : q))
    );
  const toggleRequired = (qid) =>
    setQuestions((qs) =>
      qs.map((q) => (q._id === qid ? { ...q, isRequired: !q.isRequired } : q))
    );

  const addOption = (qid) =>
    setQuestions((qs) =>
      qs.map((q) =>
        q._id === qid
          ? {
              ...q,
              options: [
                ...(q.options || []),
                { _id: cryptoRandom(), optionBody: "" },
              ],
            }
          : q
      )
    );
  const removeOption = (qid, oid) =>
    setQuestions((qs) =>
      qs.map((q) =>
        q._id === qid
          ? { ...q, options: (q.options || []).filter((o) => o._id !== oid) }
          : q
      )
    );
  const changeOptionBody = (qid, oid, v) =>
    setQuestions((qs) =>
      qs.map((q) =>
        q._id === qid
          ? {
              ...q,
              options: (q.options || []).map((o) =>
                o._id === oid ? { ...o, optionBody: v } : o
              ),
            }
          : q
      )
    );

  const payload = useMemo(() => {
    const qs = questions
      .map((q, idx) => ({
        typeName: q.typeName,
        questionBody: (q.questionBody || "").trim(),
        isRequired: q.isRequired ? "Y" : "N",
        seq: idx + 1,
        options: NEEDS_OPTIONS.has(q.typeName)
          ? (q.options || [])
              .map((o, i) => ({
                optionBody: (o.optionBody || "").trim(),
                seq: i + 1,
              }))
              .filter((o) => o.optionBody.length > 0)
          : [],
      }))
      .filter((q) => q.questionBody.length > 0);

    return {
      meetingId,
      title: (title || "").trim(),
      description: (description || "").trim() || null,
      isShow: isShow ? "Y" : "N",
      questions: qs,
    };
  }, [title, description, isShow, questions, meetingId]);

  const canSave = payload.title && payload.questions.length > 0;

  return (
    <div
      className="svr-item"
      style={{
        borderColor: "#dbe1e6",
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
      }}
    >
      <div
        className="svr-qtext"
        style={{
          marginBottom: 16,
          fontSize: 18,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: "24px" }}>✏</span>
        Kelola Survey
      </div>

      <div className="svr-editor-section">
        <div className="af-row">
          <label className="af-label">📝 Judul Survey</label>
          <input
            className="svr-text"
            placeholder="Contoh: Survey Kepuasan Peserta Meeting"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="af-row">
          <label className="af-label">📄 Deskripsi (Opsional)</label>
          <textarea
            className="svr-text"
            rows={3}
            placeholder="Jelaskan tujuan survey ini kepada peserta..."
            value={description || ""}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <label className="svr-opt" style={{ marginBottom: 0 }}>
          <input
            type="checkbox"
            checked={isShow}
            onChange={(e) => setIsShow(e.target.checked)}
          />
          <span>🌐 Tampilkan ke peserta (aktif)</span>
        </label>
      </div>

      <div
        className="svr-qtext"
        style={{ margin: "16px 0 12px 0", fontSize: 16 }}
      >
        ❓ Pertanyaan
      </div>
      <div className="svr-list">
        {questions.map((q, idx) => (
          <div className="svr-question-editor" key={q._id}>
            <div className="svr-question-controls">
              <select
                className="svr-text"
                value={q.typeName}
                onChange={(e) => changeType(q._id, e.target.value)}
                style={{ maxWidth: 200, flex: 1 }}
              >
                {(types.length
                  ? types
                  : [
                      "short_text",
                      "paragraph",
                      "multiple_choice",
                      "checkbox",
                      "date",
                    ]
                ).map((t) => (
                  <option key={t} value={t}>
                    {t === "short_text"
                      ? "📝 Teks Singkat"
                      : t === "paragraph"
                      ? "📄 Paragraf"
                      : t === "multiple_choice"
                      ? "🔘 Pilihan Ganda"
                      : t === "checkbox"
                      ? "☑ Checkbox"
                      : t === "date"
                      ? "📅 Tanggal"
                      : t}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="svr-btn"
                onClick={() => move(q._id, "up")}
                title="Pindah ke atas"
                style={{
                  background: "#f0f9ff",
                  borderColor: "#3b82f6",
                  color: "#1d4ed8",
                }}
              >
                ⬆
              </button>
              <button
                type="button"
                className="svr-btn"
                onClick={() => move(q._id, "down")}
                title="Pindah ke bawah"
                style={{
                  background: "#f0f9ff",
                  borderColor: "#3b82f6",
                  color: "#1d4ed8",
                }}
              >
                ⬇
              </button>
              <button
                type="button"
                className="svr-btn"
                onClick={() => removeQuestion(q._id)}
                title="Hapus pertanyaan"
                style={{
                  background: "#fef2f2",
                  borderColor: "#f87171",
                  color: "#dc2626",
                }}
              >
                🗑
              </button>
            </div>

            <input
              className="svr-text"
              placeholder="Tulis pertanyaan…"
              value={q.questionBody}
              onChange={(e) => changeBody(q._id, e.target.value)}
            />

            <label className="svr-opt" style={{ marginTop: 8 }}>
              <input
                type="checkbox"
                checked={q.isRequired}
                onChange={() => toggleRequired(q._id)}
              />
              <span>Wajib diisi</span>
            </label>

            {NEEDS_OPTIONS.has(q.typeName) && (
              <div style={{ marginTop: 12 }}>
                <div
                  className="svr-qtext"
                  style={{ marginBottom: 8, fontSize: 14 }}
                >
                  🎯 Opsi Jawaban
                </div>
                <div className="svr-options">
                  {(q.options || []).map((op) => (
                    <div key={op._id} className="svr-option-editor">
                      <input
                        className="svr-text"
                        placeholder="Masukkan opsi jawaban..."
                        value={op.optionBody}
                        onChange={(e) =>
                          changeOptionBody(q._id, op._id, e.target.value)
                        }
                      />
                      <button
                        type="button"
                        className="svr-btn"
                        onClick={() => removeOption(q._id, op._id)}
                        style={{
                          background: "#fef2f2",
                          borderColor: "#f87171",
                          color: "#dc2626",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="svr-btn"
                  style={{
                    marginTop: 8,
                    background: "#f0fdf4",
                    borderColor: "#22c55e",
                    color: "#16a34a",
                  }}
                  onClick={() => addOption(q._id)}
                >
                  <Icon slug="plus" /> <span>➕ Tambah Opsi</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}
      >
        <button
          type="button"
          className="svr-btn"
          onClick={() => addQuestion("short_text")}
          style={{
            background: "#f0f9ff",
            borderColor: "#3b82f6",
            color: "#1d4ed8",
          }}
        >
          <Icon slug="plus" /> <span> Tambah Pertanyaan</span>
        </button>
        <button
          type="button"
          className="svr-btn"
          onClick={onCancel}
          style={{
            background: "#f8fafc",
            borderColor: "#cbd5e1",
            color: "#64748b",
          }}
        >
          ❌ Batal
        </button>
        <button
          type="button"
          className="svr-submit"
          onClick={() => onSave(payload)}
          disabled={!canSave || saving}
          style={{
            background: canSave
              ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
              : "#9ca3af",
            boxShadow: canSave ? "0 4px 12px rgba(16, 185, 129, 0.3)" : "none",
          }}
        >
          <Icon slug="save" name="save" />
          <span>{saving ? "💾 Menyimpan…" : "💾 Simpan Survey"}</span>
        </button>
      </div>
    </div>
  );
}