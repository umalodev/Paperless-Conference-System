import React from "react";

export default function DashboardStats({ data }) {
  if (!data) return null;

  return (
    <div className="stats-section">
      <div className="stat-card">
        <h3>Total Users</h3>
        <p className="stat-number">{data.totalUsers ?? 0}</p>
      </div>

      <div className="stat-card">
        <h3>Active Meetings</h3>
        <p className="stat-number">{data.activeMeetings ?? 0}</p>
      </div>

      <div className="stat-card">
        <h3>Total Meetings</h3>
        <p className="stat-number">{data.totalMeetings ?? 0}</p>
      </div>

      <div className="stat-card">
        <h3>Total Files</h3>
        <p className="stat-number">{data.totalFiles ?? 0}</p>
      </div>

      <div className="stat-card">
        <h3>System Status</h3>
        <p
          className={`stat-status ${
            data.systemStatus === "online" ? "online" : "offline"
          }`}
        >
          {data.systemStatus || "offline"}
        </p>
      </div>
    </div>
  );
}
