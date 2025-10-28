import React from "react";

export default function Header({ latency, onRefresh }) {
  return (
    <header className="pd-topbar">
      <div className="pd-left">
        <span className="pd-live" aria-hidden />
        <div>
          <h1 className="pd-title">Master Controller</h1>
          <div className="pd-sub">
            Manage and control connected participant devices
          </div>
        </div>
      </div>
      <div className="pd-right">
        <div className="network-status">
          {latency === null ? (
            <span className="net-badge gray">--</span>
          ) : latency < 100 ? (
            <span className="net-badge green">{latency} ms</span>
          ) : latency < 300 ? (
            <span className="net-badge yellow">{latency} ms</span>
          ) : (
            <span className="net-badge red">{latency} ms</span>
          )}
        </div>
        <button className="note-btn ghost" onClick={onRefresh} title="Refresh">
          <img src="img/refresh.png" alt="Refresh" className="action-icon" />
          <span>Refresh</span>
        </button>
      </div>
    </header>
  );
}
