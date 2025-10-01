// src/pages/menu/survey/components/SurveyResponses.jsx
import React, { useEffect, useState } from "react";
import {
  getResponses,
  downloadResponsesCSV,
} from "../../../../services/surveyService";

export default function SurveyResponses({ survey }) {
  const [state, setState] = useState({ loading: true, err: "", data: null });

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!survey?.surveyId) {
        setState({ loading: false, err: "Survey belum dipilih.", data: null });
        return;
      }
      try {
        setState((s) => ({ ...s, loading: true, err: "" }));
        const data = await getResponses(survey.surveyId);
        if (!cancel) setState({ loading: false, err: "", data });
      } catch (e) {
        if (!cancel)
          setState({
            loading: false,
            err: String(e.message || e),
            data: null,
          });
      }
    })();
    return () => {
      cancel = true;
    };
  }, [survey?.surveyId]);

  if (!survey) return <div className="pd-empty">Tidak ada survey aktif.</div>;
  if (state.loading) return <div className="pd-empty">Memuat jawaban…</div>;
  if (state.err) return <div className="pd-error">{state.err}</div>;
  if (!state.data) return null;

  const { questions, responses } = state.data;

  return (
    <div className="svr-item" style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <b style={{ fontSize: 16 }}>Jawaban Peserta</b>
        <span style={{ opacity: 0.7 }}>({responses.length} respons)</span>
        <div style={{ flex: 1 }} />
        <button
          className="svr-btn"
          onClick={() => downloadResponsesCSV(survey.surveyId)}
          title="Download CSV"
          style={{
            background: "#f0f9ff",
            borderColor: "#3b82f6",
            color: "#1d4ed8",
            padding: "8px 12px",
          }}
        >
          ⬇ CSV
        </button>
      </div>

      <table
        className="pd-table"
        style={{
          minWidth: 680,
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
        }}
      >
        <thead>
          <tr>
            <th style={th}>#</th>
            <th style={th}>User</th>
            <th style={th}>Submitted</th>
            {questions.map((q) => (
              <th key={q.questionId} style={th}>
                {q.text}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {responses.length === 0 ? (
            <tr>
              <td style={td} colSpan={3 + questions.length}>
                <i>Belum ada jawaban.</i>
              </td>
            </tr>
          ) : (
            responses.map((r, i) => (
              <tr key={r.responseId}>
                <td style={td}>{i + 1}</td>
                <td style={td}>{r.username || `User-${r.userId ?? "-"}`}</td>
                <td style={td}>{formatDate(r.submittedAt)}</td>
                {questions.map((q) => (
                  <td key={`${r.responseId}-${q.questionId}`} style={td}>
                    {r.answers?.[q.questionId]?.text || (
                      <span style={{ opacity: 0.6 }}>—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const th = {
  position: "sticky",
  top: 0,
  background: "#f8fafc",
  textAlign: "left",
  padding: "8px 10px",
  fontWeight: 600,
  fontSize: 13,
  borderBottom: "1px solid #e5e7eb",
};
const td = {
  padding: "8px 10px",
  borderBottom: "1px solid #eef2f7",
  verticalAlign: "top",
  fontSize: 13,
};

function formatDate(v) {
  const d = new Date(v);
  if (isNaN(d)) return String(v || "");
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
