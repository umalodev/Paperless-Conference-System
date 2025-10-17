import React, { useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import UserManagement from "../../user-management/pages/UserManagement.jsx";
import RoleAccessManagement from "../../roleaccess/pages/RoleAccessManagement.jsx";
import TopHeader from "../components/TopHeader.jsx";
import DashboardStats from "../components/DashboardStats.jsx";
import RecentActions from "../components/RecentActions.jsx";
import useDashboardData from "../hooks/useDashboardData.js";
import "../styles/admin-dashboard.css";

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const { dashboardData, loading, error, currentTime, fetchDashboardData } = useDashboardData();

  const renderContent = () => {
    switch (activeMenu) {
      case "dashboard":
        return (
          <div className="dashboard-content">
            {loading && <p className="loading-text">Loading dashboard data...</p>}
            {error && (
              <div className="error-container">
                <p>Error: {error}</p>
                <button onClick={fetchDashboardData}>Retry</button>
              </div>
            )}
            {!loading && !error && (
              <>
                <DashboardStats data={dashboardData} />
                <RecentActions activities={dashboardData.recentActivities} />
              </>
            )}
          </div>
        );

      case "account-management":
        return <UserManagement />;

      case "role-access":
        return <RoleAccessManagement />;

      default:
        return <p>Menu not found</p>;
    }
  };

  return (
    <div className="admin-dashboard">
      <AdminSidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />
      <div className="main-content">
        <TopHeader activeMenu={activeMenu} currentTime={currentTime} />
        {renderContent()}
      </div>
    </div>
  );
}
