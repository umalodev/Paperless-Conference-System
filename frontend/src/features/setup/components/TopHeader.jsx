import React from "react";

export default function TopHeader({ hostName, onLogout }) {
  return (
    <header className="hd-top">
      <div className="hd-brand">
        <img src="img/logo.png" alt="Logo" className="hd-logo" />
        <div>
          <h1 className="hd-title">Host Dashboard</h1>
          <div className="hd-sub">welcome back, {hostName}</div>
        </div>
      </div>
      <button className="hd-logout" onClick={onLogout}>
        <span className="hd-logout-ic">↦</span> Logout
      </button>
    </header>
  );
}
