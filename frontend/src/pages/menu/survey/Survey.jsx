// src/pages/menu/survey/Survey.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../../components/BottomNav.jsx";
import Icon from "../../../components/Icon.jsx";
import { API_URL } from "../../../config.js";
import "./Survey.css";
import useMeetingGuard from "../../../hooks/useMeetingGuard.js";

export default function Survey() {
  const [user, setUser] = useState(null);

  // bottom nav (menus) dari API
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");

  // survey questions
  const [questions, setQuestions] = useState([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [errQ, setErrQ] = useState("");

  // jawaban
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingMenus(true);
        setErrMenus("");
        const res = await fetch(`${API_URL}/api/menu/user/menus`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = Array.isArray(json?.data)
          ? json.data.map((m) => ({
              slug: m.slug,
              label: m.displayLabel,
              flag: m.flag ?? "Y",
              iconUrl: m.iconMenu || null,
              seq: m.sequenceMenu,
            }))
          : [];
        if (!cancel) setMenus(list);
      } catch (e) {
        if (!cancel) setErrMenus(String(e.message || e));
      } finally {
        if (!cancel) setLoadingMenus(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingQ(true);
        setErrQ("");
        // TODO: ganti ke endpoint kamu, mis: `${API_URL}/api/survey/questions?meetingId=...`
        // const res = await fetch(`${API_URL}/api/survey/questions`, { credentials: "include" });
        // const json = await res.json();
        // const qs = json.data || [];
        const qs = [
          {
            id: "q1",
            type: "single",
            text: "Seberapa puas Anda dengan sesi ini?",
            options: ["Sangat puas", "Puas", "Cukup", "Kurang"],
            required: true,
          },
          {
            id: "q2",
            type: "multi",
            text: "Topik mana yang paling bermanfaat? (boleh lebih dari satu)",
            options: ["Pembukaan", "Materi inti", "Demo", "Tanya jawab"],
          },
          {
            id: "q3",
            type: "rating",
            text: "Nilai keseluruhan acara (1-5)",
            scale: 5,
            required: true,
          },
          { id: "q4", type: "text", text: "Saran/masukan untuk panitia" },
        ];
        if (!cancel) setQuestions(qs);
      } catch (e) {
        if (!cancel) setErrQ(String(e.message || e));
      } finally {
        if (!cancel) setLoadingQ(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const visibleMenus = useMemo(
    () =>
      (menus || [])
        .filter((m) => (m?.flag ?? "Y") === "Y")
        .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999)),
    [menus]
  );

  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  // Handlers jawaban
  const setSingle = (id, val) => setAnswers((s) => ({ ...s, [id]: val }));
  const setMulti = (id, val, checked) =>
    setAnswers((s) => {
      const curr = Array.isArray(s[id]) ? s[id] : [];
      const next = checked
        ? [...new Set([...curr, val])]
        : curr.filter((x) => x !== val);
      return { ...s, [id]: next };
    });
  const setRating = (id, val) =>
    setAnswers((s) => ({ ...s, [id]: Number(val) || 0 }));
  const setText = (id, val) => setAnswers((s) => ({ ...s, [id]: val }));

  const validate = () => {
    for (const q of questions) {
      if (!q.required) continue;
      const ans = answers[q.id];
      if (q.type === "single" && !ans) return `Harap jawab: ${q.text}`;
      if (q.type === "rating" && (!ans || ans < 1))
        return `Harap isi rating untuk: ${q.text}`;
    }
    return "";
  };

  const handleSubmit = async () => {
    setSubmitMsg("");
    const v = validate();
    if (v) {
      setSubmitMsg(v);
      return;
    }

    try {
      setSubmitting(true);
      // bentuk payload
      const payload = {
        meetingId: "MTG-001", // ganti sesuai konteks
        answers: Object.entries(answers).map(([qid, value]) => ({
          questionId: qid,
          value,
        })),
      };

      // TODO: ganti endpoint submit
      // const res = await fetch(`${API_URL}/api/survey/submit`, {
      //   method: "POST",
      //   credentials: "include",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(payload),
      // });
      // if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // const json = await res.json();

      // simulasi sukses
      await new Promise((r) => setTimeout(r, 500));
      setSubmitMsg("Terima kasih! Jawaban Anda tersimpan.");
    } catch (e) {
      setSubmitMsg(`Gagal submit: ${e.message || e}`);
    } finally {
      setSubmitting(false);
    }
  };

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  return (
    <div className="pd-app">
      {/* Top bar */}
      <header className="pd-topbar">
        <div className="pd-left">
          <span className="pd-live" aria-hidden />
          <div>
            <h1 className="pd-title">Survey</h1>
            <div className="pd-sub">Mohon berikan umpan balik Anda</div>
          </div>
        </div>
        <div className="pd-right">
          <div className="pd-clock" aria-live="polite">
            {new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div className="pd-user">
            <div className="pd-avatar">
              {(user?.username || "US").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="pd-user-name">
                {user?.username || "Participant"}
              </div>
              <div className="pd-user-role">Participant</div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pd-main">
        <section className="svr-wrap">
          <div className="svr-header">
            <div className="svr-title">
              <Icon slug="survey" iconUrl="/img/survey.svg" size={22} />
              <span>Form Survey</span>
            </div>
            <div className="svr-header-actions">
              <button
                className="svr-btn ghost"
                onClick={() => window.location.reload()}
                disabled={loadingQ}
                title="Refresh"
              >
                <RefreshIcon />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {loadingQ && <div className="pd-empty">Memuat pertanyaan…</div>}
          {errQ && !loadingQ && (
            <div className="pd-error">Gagal memuat survey: {errQ}</div>
          )}

          {!loadingQ && !errQ && (
            <>
              <div className="svr-list">
                {questions.map((q) => (
                  <QuestionCard
                    key={q.id}
                    q={q}
                    value={answers[q.id]}
                    onSingle={setSingle}
                    onMulti={setMulti}
                    onRating={setRating}
                    onText={setText}
                  />
                ))}
              </div>

              {submitMsg && (
                <div
                  className={`svr-msg ${
                    submitMsg.startsWith("Terima kasih") ? "ok" : "err"
                  }`}
                  role="status"
                >
                  {submitMsg}
                </div>
              )}

              <div className="svr-actions">
                <button
                  className="svr-submit"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  <SendIcon />
                  <span>{submitting ? "Mengirim…" : "Kirim Jawaban"}</span>
                </button>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Bottom nav dari DB */}
      {!loadingMenus && !errMenus && (
        <BottomNav
          items={visibleMenus}
          active="survey"
          onSelect={handleSelectNav}
        />
      )}
    </div>
  );
}

function QuestionCard({ q, value, onSingle, onMulti, onRating, onText }) {
  return (
    <div className="svr-item">
      <div className="svr-qtext">
        {q.text} {q.required && <span className="svr-required">*</span>}
      </div>

      {q.type === "single" && (
        <div className="svr-options">
          {q.options.map((op, idx) => (
            <label key={idx} className="svr-opt">
              <input
                type="radio"
                name={q.id}
                checked={value === op}
                onChange={() => onSingle(q.id, op)}
              />
              <span>{op}</span>
            </label>
          ))}
        </div>
      )}

      {q.type === "multi" && (
        <div className="svr-options">
          {q.options.map((op, idx) => {
            const checked = Array.isArray(value) && value.includes(op);
            return (
              <label key={idx} className="svr-opt">
                <input
                  type="checkbox"
                  checked={!!checked}
                  onChange={(e) => onMulti(q.id, op, e.target.checked)}
                />
                <span>{op}</span>
              </label>
            );
          })}
        </div>
      )}

      {q.type === "rating" && (
        <div className="svr-rating">
          {Array.from({ length: q.scale || 5 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={`svr-star ${value >= n ? "is-on" : ""}`}
              onClick={() => onRating(q.id, n)}
              aria-label={`Rating ${n}`}
            >
              ★
            </button>
          ))}
        </div>
      )}

      {q.type === "text" && (
        <textarea
          className="svr-text"
          placeholder="Tulis jawaban Anda…"
          value={value || ""}
          onChange={(e) => onText(q.id, e.target.value)}
          rows={3}
        />
      )}
    </div>
  );
}

function SendIcon() {
  return (
    <svg
      className="pd-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg
      className="pd-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-9-9" />
      <path d="M3 12l3-3 3 3" />
      <path d="M21 12l-3 3-3-3" />
    </svg>
  );
}
