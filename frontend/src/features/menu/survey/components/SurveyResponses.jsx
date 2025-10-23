import React, { useEffect, useState } from "react";
import {
  getResponses,
  downloadResponsesCSV,
  getMcStats, // ⬅️ tambah
} from "../../../../services/surveyService";
import { formatDate } from "../../../../utils/format.js";


export default function SurveyResponses({ survey }) {
  const [state, setState] = useState({ loading: true, err: "", data: null });
  const [mcStats, setMcStats] = useState({ loading: true, err: "", items: [] });

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!survey?.surveyId) {
        setState({ loading: false, err: "Survey has not been selected.", data: null });
        setMcStats({ loading: false, err: "", items: [] });
        return;
      }
      try {
        setState((s) => ({ ...s, loading: true, err: "" }));
        const data = await getResponses(survey.surveyId);
        if (!cancel) setState({ loading: false, err: "", data });
      } catch (e) {
        if (!cancel)
          setState({ loading: false, err: String(e.message || e), data: null });
      }

      // muat statistik multiple_choice
      try {
        setMcStats({ loading: true, err: "", items: [] });
        const items = await getMcStats(survey.surveyId);
        if (!cancel) setMcStats({ loading: false, err: "", items });
      } catch (e) {
        if (!cancel)
          setMcStats({
            loading: false,
            err: String(e.message || e),
            items: [],
          });
      }
    })();
    return () => {
      cancel = true;
    };
  }, [survey?.surveyId]);

  if (!survey) return <div className="pd-empty">No active survey.</div>;
  if (state.loading) return <div className="pd-empty">Loading responses...</div>;
  if (state.err) return <div className="pd-error">{state.err}</div>;
  if (!state.data) return null;

  const { questions, responses } = state.data;

  return (
    <div className="svr-item" style={{ overflowX: "auto" }}>
      {/* Header + tombol CSV */}
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

      {/* Tabel jawaban */}
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

      {/* Diagram ringkasan Multiple Choice */}
      <div style={{ marginTop: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <b style={{ fontSize: 16 }}>Ringkasan Pilihan (Multiple Choice)</b>
          {mcStats.loading && <span className="pd-sub">memuat…</span>}
          {mcStats.err && <span className="pd-error">{mcStats.err}</span>}
        </div>

        {(!mcStats.items || mcStats.items.length === 0) && !mcStats.loading ? (
          <div className="pd-empty">Tidak ada pertanyaan pilihan ganda.</div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {mcStats.items.map((q) => (
              <div
                key={q.questionId}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{q.text}</div>
                  <div style={{ opacity: 0.6, fontSize: 12 }}>
                    ({q.total} jawaban)
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  {q.options.map((op) => (
                    <div key={op.optionId}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          marginBottom: 4,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            marginRight: 8,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {op.label}
                        </div>
                        <div style={{ opacity: 0.7 }}>
                          {op.count} • {op.percent.toFixed(2)}%
                        </div>
                      </div>
                      <div
                        style={{
                          background: "#f1f5f9",
                          height: 10,
                          borderRadius: 999,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${op.percent}%`,
                            height: "100%",
                            background: "#3b82f6",
                            transition: "width .3s ease",
                          }}
                          aria-label={`${op.label}: ${op.percent}%`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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

