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
    <div className="svr-item" style={{ borderColor: "#dbe1e6" }}>
      <div className="svr-qtext" style={{ marginBottom: 8 }}>
        Kelola Survey
      </div>

      <div className="af-row" style={{ marginBottom: 8 }}>
        <label className="af-label">Judul</label>
        <input
          className="svr-text"
          placeholder="Contoh: Survey Kepuasan"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="af-row" style={{ marginBottom: 8 }}>
        <label className="af-label">Deskripsi</label>
        <textarea
          className="svr-text"
          rows={2}
          placeholder="Opsional"
          value={description || ""}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <label className="svr-opt" style={{ marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={isShow}
          onChange={(e) => setIsShow(e.target.checked)}
        />
        <span>Tampilkan ke peserta (aktif)</span>
      </label>

      <div className="svr-qtext" style={{ margin: "8px 0" }}>
        Pertanyaan
      </div>
      <div className="svr-list">
        {questions.map((q, idx) => (
          <div className="svr-item" key={q._id}>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <select
                className="svr-text"
                value={q.typeName}
                onChange={(e) => changeType(q._id, e.target.value)}
                style={{ maxWidth: 220 }}
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
                    {t}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="svr-btn"
                onClick={() => move(q._id, "up")}
                title="Naik"
              >
                ▲
              </button>
              <button
                type="button"
                className="svr-btn"
                onClick={() => move(q._id, "down")}
                title="Turun"
              >
                ▼
              </button>
              <button
                type="button"
                className="svr-btn"
                onClick={() => removeQuestion(q._id)}
                title="Hapus"
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
              <div style={{ marginTop: 8 }}>
                <div className="svr-qtext" style={{ marginBottom: 6 }}>
                  Opsi
                </div>
                <div className="svr-options">
                  {(q.options || []).map((op) => (
                    <div key={op._id} className="svr-opt" style={{ gap: 8 }}>
                      <input
                        className="svr-text"
                        placeholder="Teks opsi…"
                        value={op.optionBody}
                        onChange={(e) =>
                          changeOptionBody(q._id, op._id, e.target.value)
                        }
                      />
                      <button
                        type="button"
                        className="svr-btn"
                        onClick={() => removeOption(q._id, op._id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="svr-btn"
                  style={{ marginTop: 8 }}
                  onClick={() => addOption(q._id)}
                >
                  <Icon slug="plus" /> <span>Tambah Opsi</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          type="button"
          className="svr-btn"
          onClick={() => addQuestion("short_text")}
        >
          <Icon slug="plus" /> <span>Tambah Pertanyaan</span>
        </button>
        <button type="button" className="svr-btn" onClick={onCancel}>
          Batal
        </button>
        <button
          type="button"
          className="svr-submit"
          onClick={() => onSave(payload)}
          disabled={!canSave || saving}
        >
          <Icon slug="save" name="save" />
          <span>{saving ? "Menyimpan…" : "Simpan Survey"}</span>
        </button>
      </div>
    </div>
  );
}
