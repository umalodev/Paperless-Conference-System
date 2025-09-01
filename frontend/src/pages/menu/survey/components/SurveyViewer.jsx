import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../../../components/Icon.jsx";
import {
  getMyResponse,
  submitResponses,
} from "../../../../services/surveyService.js";

export default function SurveyViewer({ survey, meetingId }) {
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  const questions = useMemo(() => {
    const qs = (survey?.Questions || [])
      .slice()
      .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
      .map((q) => ({
        id: q.questionId,
        type: (q.typeName || "").toLowerCase(), // short_text | paragraph | multiple_choice | checkbox | date
        text: q.questionBody,
        required: q.isRequired === "Y",
        options: (q.Options || [])
          .slice()
          .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
          .map((o) => ({ optionId: o.optionId, label: o.optionBody })),
      }));
    return qs;
  }, [survey]);

  // Prefill & tandai jika sudah submit
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!survey?.surveyId) return;
      try {
        setLoading(true);
        const my = await getMyResponse(survey.surveyId); // { submissionId, answers: [...] } atau null
        if (cancel) return;
        if (my?.answers?.length) {
          // isi state jawaban (untuk opsi "lihat jawaban")
          const pre = {};
          for (const a of my.answers) {
            if (a.selectedOptionId != null)
              pre[a.questionId] = Number(a.selectedOptionId);
            else if (a.selectedOptionIds)
              pre[a.questionId] = a.selectedOptionIds.map(Number);
            else if (a.answerDate) pre[a.questionId] = String(a.answerDate);
            else if (a.answerText != null) pre[a.questionId] = a.answerText;
          }
          setAnswers(pre);
          setAlreadySubmitted(true);
          setSubmitMsg("Terima kasih! Anda sudah mengisi survey ini.");
        } else {
          setAlreadySubmitted(false);
          setAnswers({});
          setSubmitMsg("");
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [survey]);

  // Handlers input
  const setSingleChoice = (qid, optionId) =>
    setAnswers((s) => ({ ...s, [qid]: Number(optionId) }));
  const setMultiChoice = (qid, optionId, checked) =>
    setAnswers((s) => {
      const curr = Array.isArray(s[qid]) ? s[qid] : [];
      const oid = Number(optionId);
      const next = checked
        ? [...new Set([...curr, oid])]
        : curr.filter((x) => x !== oid);
      return { ...s, [qid]: next };
    });
  const setText = (qid, val) => setAnswers((s) => ({ ...s, [qid]: val }));
  const setDate = (qid, val) => setAnswers((s) => ({ ...s, [qid]: val }));

  const validate = () => {
    for (const q of questions) {
      if (!q.required) continue;
      const ans = answers[q.id];
      switch (q.type) {
        case "short_text":
        case "paragraph":
        case "date":
          if (!ans || String(ans).trim() === "") return `Harap isi: ${q.text}`;
          break;
        case "multiple_choice":
          if (ans === undefined || ans === null || ans === "")
            return `Harap pilih jawaban: ${q.text}`;
          break;
        case "checkbox":
          if (!Array.isArray(ans) || ans.length === 0)
            return `Harap pilih minimal satu: ${q.text}`;
          break;
        default:
          break;
      }
    }
    return "";
  };

  const handleSubmit = async () => {
    setSubmitMsg("");
    const v = validate();
    if (v) return setSubmitMsg(v);
    if (!survey?.surveyId || !meetingId)
      return setSubmitMsg("Survey tidak siap.");

    try {
      setSubmitting(true);
      const responses = Object.entries(answers).map(([questionId, value]) => ({
        questionId: Number(questionId),
        value,
      }));
      await submitResponses({
        surveyId: survey.surveyId,
        meetingId,
        responses,
      });
      setAlreadySubmitted(true);
      setSubmitMsg("Terima kasih! Jawaban Anda tersimpan.");
    } catch (e) {
      setSubmitMsg(`Gagal submit: ${e.message || e}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!survey) {
    return <div className="pd-empty">Belum ada survey yang ditampilkan.</div>;
  }

  // === MODE SUDAH SUBMIT: tampilkan pesan terima kasih, opsional lihat jawaban ===
  if (alreadySubmitted) {
    return (
      <>
        {survey.title ? (
          <div className="svr-msg ok" style={{ marginBottom: 10 }}>
            <b>{survey.title}</b>
            {survey.description ? ` — ${survey.description}` : ""}
          </div>
        ) : null}

        <div className="svr-msg ok" style={{ marginBottom: 10 }}>
          Terima kasih! Anda sudah mengisi survey ini.
        </div>

        <div className="svr-actions" style={{ justifyContent: "flex-start" }}>
          <button className="svr-btn" onClick={() => setShowAnswers((v) => !v)}>
            <Icon slug="eye" />{" "}
            <span>
              {showAnswers ? "Sembunyikan jawaban" : "Lihat jawaban saya"}
            </span>
          </button>
        </div>

        {showAnswers && (
          <div className="svr-list" style={{ marginTop: 10 }}>
            {questions.map((q) => (
              <div className="svr-item" key={q.id}>
                <div className="svr-qtext">{q.text}</div>
                <div>
                  {q.type === "multiple_choice" && (
                    <span>
                      {q.options.find(
                        (op) => Number(op.optionId) === Number(answers[q.id])
                      )?.label || <i>(kosong)</i>}
                    </span>
                  )}
                  {q.type === "checkbox" && (
                    <span>
                      {Array.isArray(answers[q.id]) && answers[q.id].length ? (
                        q.options
                          .filter((op) =>
                            answers[q.id]
                              .map(Number)
                              .includes(Number(op.optionId))
                          )
                          .map((op) => op.label)
                          .join(", ")
                      ) : (
                        <i>(kosong)</i>
                      )}
                    </span>
                  )}
                  {(q.type === "short_text" || q.type === "paragraph") && (
                    <span>{answers[q.id]?.toString() || <i>(kosong)</i>}</span>
                  )}
                  {q.type === "date" && (
                    <span>{answers[q.id] || <i>(kosong)</i>}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  // === MODE BELUM SUBMIT: render form seperti biasa ===
  return (
    <>
      {survey.title ? (
        <div className="svr-msg ok" style={{ marginBottom: 10 }}>
          <b>{survey.title}</b>
          {survey.description ? ` — ${survey.description}` : ""}
        </div>
      ) : null}

      <div className="svr-list">
        {questions.map((q) => (
          <div className="svr-item" key={q.id}>
            <div className="svr-qtext">
              {q.text} {q.required && <span className="svr-required">*</span>}
            </div>

            {q.type === "multiple_choice" && (
              <div className="svr-options">
                {q.options.map((op) => (
                  <label key={op.optionId} className="svr-opt">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={Number(answers[q.id]) === Number(op.optionId)}
                      onChange={() => setSingleChoice(q.id, op.optionId)}
                    />
                    <span>{op.label}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === "checkbox" && (
              <div className="svr-options">
                {q.options.map((op) => {
                  const checked =
                    Array.isArray(answers[q.id]) &&
                    answers[q.id].map(Number).includes(Number(op.optionId));
                  return (
                    <label key={op.optionId} className="svr-opt">
                      <input
                        type="checkbox"
                        checked={!!checked}
                        onChange={(e) =>
                          setMultiChoice(q.id, op.optionId, e.target.checked)
                        }
                      />
                      <span>{op.label}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {q.type === "short_text" && (
              <input
                type="text"
                className="svr-text"
                placeholder="Tulis jawaban singkat…"
                value={answers[q.id] || ""}
                onChange={(e) => setText(q.id, e.target.value)}
              />
            )}

            {q.type === "paragraph" && (
              <textarea
                className="svr-text"
                placeholder="Tulis jawaban…"
                value={answers[q.id] || ""}
                onChange={(e) => setText(q.id, e.target.value)}
                rows={3}
              />
            )}

            {q.type === "date" && (
              <input
                type="date"
                className="svr-text"
                value={answers[q.id] || ""}
                onChange={(e) => setDate(q.id, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      {submitMsg && (
        <div
          className={`svr-msg ${
            submitMsg.startsWith("Terima kasih") ? "ok" : "err"
          }`}
        >
          {submitMsg}
        </div>
      )}

      <div className="svr-actions">
        <button
          className="svr-submit"
          onClick={handleSubmit}
          disabled={submitting || loading}
        >
          <Icon slug="send" />
          <span>{submitting ? "Mengirim…" : "Kirim Jawaban"}</span>
        </button>
      </div>
    </>
  );
}
