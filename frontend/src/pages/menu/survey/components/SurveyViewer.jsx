// src/pages/menu/survey/components/SurveyViewer.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import Icon from "../../../../components/Icon.jsx";
import { API_URL } from "../../../../config.js";
import { getMyResponse, submitResponses } from "../../../../services/surveyService.js";

/**
 * Props:
 * - survey: minimal { surveyId } atau boleh berisi title/description/questions (akan di-kanonisasi)
 * - meetingId: string|number
 */
export default function SurveyViewer({ survey, meetingId }) {
  const [canon, setCanon] = useState(null);      // survey kanonik (dari server)
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState({});
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ==== helpers ====
  const toBoolYN = (v) => v === "Y" || v === true;
  const mapType = (t) => {
    const x = String(t || "").toLowerCase();
    const m = {
      text: "short_text",
      short_text: "short_text",
      textarea: "long_text",
      paragraph: "long_text",
      long_text: "long_text",
      radio: "single_choice",
      single_choice: "single_choice",
      multiple_choice: "single_choice", // legacy
      checkbox: "multi_choice",
      multi_choice: "multi_choice",
      scale: "rating",
      rating: "rating",
      date: "date",
    };
    return m[x] || "short_text";
  };
  const normOptions = (opts) => {
    if (!Array.isArray(opts)) return [];
    // server: [{optionId,label}] | editor: [string]
    if (opts.length && typeof opts[0] === "string") {
      return opts.map((label, i) => ({ id: i + 1, label: String(label) }));
    }
    return opts.map((o, i) => ({
      id: o?.optionId ?? o?.id ?? i + 1,
      label: o?.label ?? o?.optionBody ?? String(o ?? ""),
    }));
  };
  const normalizeQuestion = (q, i = 0) => ({
    id: q?.questionId ?? q?.id ?? i + 1,
    type: mapType(q?.type ?? q?.typeName ?? q?.questionType ?? q?.kind),
    text: q?.text ?? q?.title ?? q?.label ?? q?.questionBody ?? "",
    required: toBoolYN(q?.required ?? q?.isRequired),
    options: normOptions(q?.options ?? q?.choices ?? q?.Options ?? q?.Choices),
    max: Number(q?.max ?? q?.maxRating ?? 5) || 5,
    order:
      typeof q?.order === "number"
        ? q.order
        : typeof q?.seq === "number"
        ? q.seq
        : i,
  });

  const normalizeSurvey = (s) => {
    if (!s) return null;
    const qs = Array.isArray(s.questions)
      ? s.questions
      : Array.isArray(s.Questions)
      ? s.Questions
      : [];
    return {
      surveyId: s.surveyId ?? s.id,
      title: s.title ?? s.surveyTitle ?? "",
      description: s.description ?? s.surveyDescription ?? "",
      isShow: toBoolYN(s.isShow ?? s.is_show),
      questions: qs.map(normalizeQuestion).sort((a, b) => a.order - b.order),
    };
  };

  // ==== fetch kanonik dari server (WAJIB) ====
  const fetchCanonical = useCallback(async (sid) => {
    // coba beberapa endpoint umum; pilih yang tersedia di backend-mu
    const tryUrls = [
      `${API_URL}/api/surveys/${sid}`,                 // GET {data}
      `${API_URL}/api/survey/${sid}`,                  // GET {data}
      `${API_URL}/api/surveys/detail/${sid}`,          // GET {data}
    ];
    for (const url of tryUrls) {
      try {
        const res = await fetch(url, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) continue;
        const json = await res.json();
        const raw = json?.data ?? json?.survey ?? json;
        if (raw) return normalizeSurvey(raw);
      } catch {
        // lanjut coba url berikutnya
      }
    }
    return null;
  }, []);

  // bootstrapping: selalu pakai versi kanonik (dengan id opsi dari DB)
  useEffect(() => {
    let cancel = false;
    (async () => {
      const sid = survey?.surveyId ?? survey?.id;
      if (!sid) {
        setCanon(null);
        return;
      }
      setLoading(true);
      try {
        // 1) kalau prop survey sudah lengkap (punya questions & optionId), boleh pakai
        let base = normalizeSurvey(survey);
        const needsFetch =
          !base?.questions?.length ||
          base.questions.some(
            (q) =>
              (q.type === "single_choice" || q.type === "multi_choice") &&
              q.options.some((o) => o.id == null) // belum ada id dari server
          );

        // 2) ambil dari server supaya dapat questionId/optionId asli
        if (needsFetch) {
          const fetched = await fetchCanonical(sid);
          if (cancel) return;
          if (fetched?.questions?.length) base = fetched;
        }
        setCanon(base);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [survey, fetchCanonical]);

  const questions = useMemo(() => canon?.questions || [], [canon]);

  // ==== Prefill status jawaban user ====
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!canon?.surveyId) return;
      const my = await getMyResponse(canon.surveyId).catch(() => null);
      if (cancel) return;
      if (my?.answers?.length) {
        const pre = {};
        for (const a of my.answers) {
          if (a.selectedOptionId != null) pre[a.questionId] = Number(a.selectedOptionId);
          else if (Array.isArray(a.selectedOptionIds)) pre[a.questionId] = a.selectedOptionIds.map(Number);
          else if (a.answerRating != null) pre[a.questionId] = Number(a.answerRating);
          else if (a.answerNumber != null) pre[a.questionId] = Number(a.answerNumber);
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
    })();
    return () => {
      cancel = true;
    };
  }, [canon?.surveyId]);

  // ==== Handlers ====
  const setSingle = (qid, optionId) =>
    setAnswers((s) => ({ ...s, [qid]: Number(optionId) }));
  const setMulti = (qid, optionId, checked) =>
    setAnswers((s) => {
      const curr = Array.isArray(s[qid]) ? s[qid] : [];
      const oid = Number(optionId);
      const next = checked ? [...new Set([...curr, oid])] : curr.filter((x) => x !== oid);
      return { ...s, [qid]: next };
    });
  const setText = (qid, val) => setAnswers((s) => ({ ...s, [qid]: val }));
  const setDate = (qid, val) => setAnswers((s) => ({ ...s, [qid]: val }));
  const setRating = (qid, val) => setAnswers((s) => ({ ...s, [qid]: Number(val) }));

  // validasi wajib isi
  const validate = () => {
    for (const q of questions) {
      if (!q.required) continue;
      const v = answers[q.id];
      if (q.type === "short_text" || q.type === "long_text" || q.type === "date") {
        if (!v || String(v).trim() === "") return `Harap isi: ${q.text}`;
      } else if (q.type === "single_choice") {
        if (v === undefined || v === null || v === "") return `Harap pilih jawaban: ${q.text}`;
      } else if (q.type === "multi_choice") {
        if (!Array.isArray(v) || !v.length) return `Harap pilih minimal satu: ${q.text}`;
      } else if (q.type === "rating") {
        if (!v || Number(v) < 1) return `Harap beri penilaian: ${q.text}`;
      }
    }
    return "";
  };

  // bentuk respons fleksibel (agar cocok dengan berbagai backend)
  const buildResponses = () =>
    Object.entries(answers).map(([questionId, value]) => {
      const q = questions.find((x) => Number(x.id) === Number(questionId));
      const base = { questionId: Number(questionId), value };
      if (!q) return base;
      if (q.type === "single_choice") return { ...base, selectedOptionId: Number(value) };
      if (q.type === "multi_choice") return { ...base, selectedOptionIds: (value || []).map(Number) };
      if (q.type === "short_text" || q.type === "long_text") return { ...base, answerText: String(value || "") };
      if (q.type === "date") return { ...base, answerDate: String(value || "") };
      if (q.type === "rating") return { ...base, answerRating: Number(value) };
      return base;
    });

  const handleSubmit = async () => {
    setSubmitMsg("");
    const msg = validate();
    if (msg) return setSubmitMsg(msg);
    if (!canon?.surveyId || !meetingId) return setSubmitMsg("Survey tidak siap.");

    try {
      setSubmitting(true);
      const responses = buildResponses();
      await submitResponses({
        surveyId: canon.surveyId,
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

  // ==== UI ====
  if (!canon) {
    return <div className="pd-empty">{loading ? "Memuat survey…" : "Belum ada survey yang ditampilkan."}</div>;
  }

  // catatan: latar gelap di screenshot-mu berasal dari preferensi sistem (CSS dark mode).
  // Komponen ini mengikuti CSS yang sudah kamu buat; kalau mau selalu terang, bungkus dengan class yang override di CSS.

  // SUDAH SUBMIT: terima kasih + opsional lihat jawaban
  if (alreadySubmitted) {
    return (
      <>
        {canon.title ? (
          <div className="svr-msg ok" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 24 }}>✅</div>
              <div>
                <b style={{ fontSize: 18 }}>{canon.title}</b>
                {canon.description && (
                  <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>{canon.description}</div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="svr-msg ok" style={{ marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Terima kasih! Survey berhasil dikirim.</div>
          <div style={{ fontSize: 14, opacity: 0.8 }}>Jawaban Anda telah tersimpan dengan aman.</div>
        </div>

        <div className="svr-actions" style={{ justifyContent: "center" }}>
          <button
            className="svr-btn"
            onClick={() => setShowAnswers((v) => !v)}
            style={{ background: "#f0f9ff", borderColor: "#3b82f6", color: "#1d4ed8", padding: "12px 20px" }}
          >
            <Icon slug="eye" />
            <span>{showAnswers ? "Sembunyikan jawaban" : "👀 Lihat jawaban saya"}</span>
          </button>
        </div>

        {showAnswers && (
          <div className="svr-list" style={{ marginTop: 10 }}>
            {questions.map((q) => (
              <div className="svr-item" key={q.id}>
                <div className="svr-qtext">{q.text}</div>
                <div>
                  {q.type === "single_choice" && (
                    <span>
                      {q.options.find((op) => Number(op.id) === Number(answers[q.id]))?.label || <i>(kosong)</i>}
                    </span>
                  )}
                  {q.type === "multi_choice" && (
                    <span>
                      {Array.isArray(answers[q.id]) && answers[q.id].length
                        ? q.options
                            .filter((op) => answers[q.id].map(Number).includes(Number(op.id)))
                            .map((op) => op.label)
                            .join(", ")
                        : <i>(kosong)</i>}
                    </span>
                  )}
                  {(q.type === "short_text" || q.type === "long_text") && (
                    <span>{answers[q.id]?.toString() || <i>(kosong)</i>}</span>
                  )}
                  {q.type === "date" && <span>{answers[q.id] || <i>(kosong)</i>}</span>}
                  {q.type === "rating" && <span>{answers[q.id] ? `${answers[q.id]} / ${q.max}` : <i>(kosong)</i>}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  // BELUM SUBMIT: tampilkan form
  return (
    <>
      <div className="svr-header" style={{ marginBottom: 10 }}>
        <div className="svr-title">
          <img src="/img/Survey1.png" alt="" className="svr-title-icon" />
          <div className="svr-title-text">Form Survey</div>
        </div>
        <button
          className="svr-btn"
          onClick={async () => {
            if (!canon?.surveyId) return;
            setLoading(true);
            const fresh = await fetchCanonical(canon.surveyId);
            if (fresh?.questions?.length) setCanon(fresh);
            setLoading(false);
          }}
          disabled={loading}
        >
          <Icon slug="refresh" />
          <span>Refresh</span>
        </button>
      </div>

      {canon.title ? (
        <div className="svr-msg ok" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 24 }}>📋</div>
            <div>
              <b style={{ fontSize: 18 }}>{canon.title}</b>
              {canon.description && (
                <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>{canon.description}</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {loading && <div className="pd-empty">Memuat pertanyaan…</div>}

      <div className="svr-list">
        {questions.map((q) => (
          <div className="svr-item" key={q.id}>
            <div className="svr-qtext">
              {q.text} {q.required && <span className="svr-required">*</span>}
            </div>

            {q.type === "single_choice" && (
              <div className="svr-options">
                {q.options.map((op) => (
                  <label key={op.id} className="svr-opt">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={Number(answers[q.id]) === Number(op.id)}
                      onChange={() => setSingle(q.id, op.id)}
                    />
                    <span>{op.label}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === "multi_choice" && (
              <div className="svr-options">
                {q.options.map((op) => {
                  const checked =
                    Array.isArray(answers[q.id]) &&
                    answers[q.id].map(Number).includes(Number(op.id));
                  return (
                    <label key={op.id} className="svr-opt">
                      <input
                        type="checkbox"
                        checked={!!checked}
                        onChange={(e) => setMulti(q.id, op.id, e.target.checked)}
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

            {q.type === "long_text" && (
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

            {q.type === "rating" && (
              <div className="svr-rating" style={{ marginTop: 6 }}>
                {Array.from({ length: Math.max(2, Math.min(10, Number(q.max) || 5)) }).map((_, idx) => {
                  const val = idx + 1;
                  const active = Number(answers[q.id]) >= val;
                  return (
                    <button
                      key={val}
                      type="button"
                      className={`svr-star ${active ? "is-on" : ""}`}
                      aria-label={`Pilih rating ${val}`}
                      onClick={() => setRating(q.id, val)}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {submitMsg && (
        <div className={`svr-msg ${submitMsg.startsWith("Terima kasih") ? "ok" : "err"}`}>
          {submitMsg}
        </div>
      )}

      <div className="svr-actions">
        <button className="svr-submit" onClick={handleSubmit} disabled={submitting || loading}>
          <Icon slug="send" />
          <span>{submitting ? "Mengirim…" : "Kirim Jawaban"}</span>
        </button>
      </div>
    </>
  );
}
