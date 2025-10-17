import React from "react";

export default function UserStats({ users, countByRole }) {
  return (
    <div className="user-stats">
      <div className="stat-card">
        <h3>Total Users</h3>
        <p className="stat-number">{users.length}</p>
      </div>
      <div className="stat-card">
        <h3>Admins</h3>
        <p className="stat-number">{countByRole("admin")}</p>
      </div>
      <div className="stat-card">
        <h3>Hosts</h3>
        <p className="stat-number">{countByRole("host")}</p>
      </div>
      <div className="stat-card">
        <h3>Participants</h3>
        <p className="stat-number">{countByRole("participant")}</p>
      </div>
      <div className="stat-card">
        <h3>Assists</h3>
        <p className="stat-number">{countByRole("assist")}</p>
      </div>
    </div>
  );
}
