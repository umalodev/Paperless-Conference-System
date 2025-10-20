import React from "react";
import { toLocalDT } from "../utils/datetime.js";

export default function HistoryList({ history, loading, error, onBack }) {
  return (
    <section className="hd-recent">
      <div className="hd-recent-head">
        <div>
          <div className="hd-recent-title">Meeting History</div>
          <div className="hd-recent-sub">Meetings you’ve ended</div>
        </div>
        <button className="hd-btn hd-outline" onClick={onBack}>
          Back to Scheduled
        </button>
      </div>

      <div className="hd-recent-list">
        {loading && <div className="hd-empty">Loading…</div>}
        {error && !loading && <div className="hd-error">Error: {error}</div>}
        {!loading && !error && history.length === 0 && (
          <div className="hd-empty">No meeting history.</div>
        )}
        {!loading &&
          !error &&
          history.map((m) => (
            <div key={m.meetingId} className="hd-meet-item">
              <div className="hd-meet-left">
                <div className="hd-meet-title">{m.title}</div>
                <div className="hd-meet-meta">
                  <span className={`hd-badge ${m.status}`}>{m.status}</span>
                  <span className="hd-meta">ID: {m.meetingId}</span>
                  <span className="hd-meta">{m.participants} participants</span>
                  <span className="hd-meta">{toLocalDT(m.startTime)}</span>
                </div>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
