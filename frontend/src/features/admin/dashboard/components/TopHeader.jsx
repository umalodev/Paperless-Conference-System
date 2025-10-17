import React from "react";

export default function TopHeader({ activeMenu, currentTime }) {
  const getTitle = () => {
    switch (activeMenu) {
      case "dashboard": return "Dashboard";
      case "account-management": return "User Management";
      case "role-access": return "Role Access";
      default: return "Dashboard";
    }
  };

  const getSubtitle = () => {
    switch (activeMenu) {
      case "dashboard": return "Overview & Statistics";
      case "account-management": return "User & Role Management";
      case "role-access": return "Menu Access Control";
      default: return "Overview & Statistics";
    }
  };

  return (
    <header className="top-header">
      <div className="header-left">
        <h1>{getTitle()}</h1>
        <p>{getSubtitle()}</p>
      </div>
      <div className="header-right">
        <div className="time-date">
          <div className="time">{currentTime.time}</div>
          <div className="date">{currentTime.date}</div>
        </div>
        <div className="user-profile">
          <div className="user-avatar">👤</div>
        </div>
      </div>
    </header>
  );
}
