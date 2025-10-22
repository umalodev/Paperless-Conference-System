import React, { useEffect, useMemo, useState, useRef } from "react";
import Icon from "../../../../components/Icon.jsx";
import { listTypes } from "../../../../services/surveyService.js";

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
  const titleRef = useRef(null);
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
      [copy[i], copy[j]] = [copy[j], copy[i]];
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
    <div className="svr-item" style={{ background: "#fff", padding: "20px" }}>
      <div
        className="svr-qtext"
        style={{
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "#0f172a",
        }}
      >
        <Icon slug="edit" size={22} />
        Manage Surveys
      </div>

      {/* === Basic Info === */}
      <div className="svr-editor-section" style={{ marginBottom: 20 }}>
        <label className="af-label">📝 Survey Title *</label>
        <input
          ref={titleRef}
          required
          className="svr-text"
          placeholder="Example: Meeting Participant Satisfaction Survey"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            marginBottom: 6,
            width: "100%",
            boxSizing: "border-box", 
          }}
        />
        <label className="af-label" style={{ marginTop: 12 }}>
          📄 Description (optional)
        </label>
        <textarea
          className="svr-text"
          rows={3}
          placeholder="Explain the purpose of this survey..."
          value={description || ""}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            marginBottom: 6,
            width: "100%",
            boxSizing: "border-box", // ⛔ cegah keluar dari card
          }}
        />

        <label className="svr-opt" style={{ marginTop: 12 }}>
          <input
            type="checkbox"
            checked={isShow}
            onChange={(e) => setIsShow(e.target.checked)}
          />
          <span>🌐 Show to participants (active)</span>
        </label>
      </div>

      {/* === Questions Section === */}
      <div className="svr-qtext" style={{ margin: "10px 0 16px", fontSize: 18 }}>
        Questions ❓
      </div>

      <div className="svr-list"   style={{
    display: "grid",
    gridTemplateColumns: "1fr", // 🔥 satu kolom penuh
    gap: "14px",
  }}
>
        {questions.map((q) => (
          <div
            className="svr-question-editor"
            key={q._id}
            style={{
              background: "#f9fafb",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 16,
              marginBottom: 14,
              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            }}
          >
            <div
              className="svr-question-controls"
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <select
                className="svr-text"
                value={q.typeName}
                onChange={(e) => changeType(q._id, e.target.value)}
                style={{
                  flex: 1,
                  maxWidth: 220,
                  background: "#fff",
                }}
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
                    {t.replace("_", " ").toUpperCase()}
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  className="svr-btn sm"
                  onClick={() => move(q._id, "up")}
                  title="Move up"
                >
                  ⬆
                </button>
                <button
                  type="button"
                  className="svr-btn sm"
                  onClick={() => move(q._id, "down")}
                  title="Move down"
                >
                  ⬇
                </button>
                <button
                  type="button"
                  className="svr-btn sm danger"
                  onClick={() => removeQuestion(q._id)}
                  title="Delete question"
                >
                  🗑
                </button>
              </div>
            </div>

            <input
              className="svr-text"
              placeholder="Write question..."
              value={q.questionBody}
              onChange={(e) => changeBody(q._id, e.target.value)}
              style={{
                marginBottom: 6,
                width: "100%",
                boxSizing: "border-box",
                marginBottom: 6
              }}
            />

            <label className="svr-opt" style={{ marginBottom: 10 }}>
              <input
                type="checkbox"
                checked={q.isRequired}
                onChange={() => toggleRequired(q._id)}
              />
              <span>Required</span>
            </label>

            {NEEDS_OPTIONS.has(q.typeName) && (
              <div style={{ marginTop: 8 }}>
                <div className="svr-qtext" style={{ marginBottom: 6 }}>
                  🎯 Answer Options
                </div>
                {(q.options || []).map((op) => (
                  <div
                    key={op._id}
                    className="svr-option-editor"
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <input
                      className="svr-text"
                      placeholder="Enter answer option..."
                      value={op.optionBody}
                      onChange={(e) =>
                        changeOptionBody(q._id, op._id, e.target.value)
                      }
                    />
                    <button
                      type="button"
                      className="svr-btn sm danger"
                      onClick={() => removeOption(q._id, op._id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="svr-btn sm"
                  style={{
                    background: "#f0fdf4",
                    borderColor: "#22c55e",
                    color: "#16a34a",
                    marginTop: 4,
                  }}
                  onClick={() => addOption(q._id)}
                >
                  + Add Option
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 20,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          className="svr-btn"
          onClick={() => addQuestion("short_text")}
        >
          ➕ Add Question
        </button>
        <button
          type="button"
          className="svr-btn ghost"
          onClick={onCancel}
          style={{ background: "#f8fafc" }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="svr-submit"
          onClick={() => {
            if (!payload.title) {
              if (titleRef.current) {
                titleRef.current.setCustomValidity("Title is required.");
                titleRef.current.reportValidity();
                titleRef.current.focus();
              }
              return;
            }
            onSave(payload);
          }}
          disabled={!canSave}
          style={{
            background: canSave
              ? "linear-gradient(135deg,#10b981,#059669)"
              : "#94a3b8",
          }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
