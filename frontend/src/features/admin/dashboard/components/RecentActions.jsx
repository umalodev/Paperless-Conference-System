import React from "react";

export default function RecentActions({ activities = [] }) {
  return (
    <div className="recent-actions">
      <h2>Recent Actions</h2>
      <div className="activity-list">
        {activities.length > 0 ? (
          activities.map((a, i) => (
            <div key={i} className="activity-item">
              <div className="activity-icon">{a.icon || "📊"}</div>
              <div className="activity-content">
                <p className="activity-text">{a.text}</p>
                <span className="activity-time">{a.time}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="activity-item">
            <div className="activity-icon">📊</div>
            <div className="activity-content">
              <p>No recent activities</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
