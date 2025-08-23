import React, { useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import UserManagement from '../akun/UserManagement.jsx';
import RoleAccessManagement from '../akun/RoleAccessManagement.jsx';
import './admin-dashboard.css';

const AdminDashboard = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');

  const handleMenuChange = (menuId) => {
    setActiveMenu(menuId);
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return (
          <div className="dashboard-content">
            {/* Stats Section */}
            <div className="stats-section">
              <div className="stat-card">
                <h3>Total Users</h3>
                <p className="stat-number">25</p>
                <span className="stat-change positive">+12%</span>
              </div>
              <div className="stat-card">
                <h3>Active Meetings</h3>
                <p className="stat-number">3</p>
                <span className="stat-change positive">+5%</span>
              </div>
              <div className="stat-card">
                <h3>Total Files</h3>
                <p className="stat-number">156</p>
                <span className="stat-change positive">+23%</span>
              </div>
              <div className="stat-card">
                <h3>System Status</h3>
                <p className="stat-status online">Online</p>
                <span className="stat-change">99.9%</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <h2>Quick Actions</h2>
              <div className="action-buttons">
                <button className="action-btn primary">Create New Meeting</button>
                <button className="action-btn secondary">Add New User</button>
                <button className="action-btn secondary">Upload Files</button>
                <button className="action-btn secondary">Generate Report</button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="recent-activity">
              <h2>Recent Activity</h2>
              <div className="activity-list">
                <div className="activity-item">
                  <div className="activity-icon">👤</div>
                  <div className="activity-content">
                    <p className="activity-text">New user registered: john_doe</p>
                    <span className="activity-time">2 minutes ago</span>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-icon">📁</div>
                  <div className="activity-content">
                    <p className="activity-text">File uploaded: presentation.pdf</p>
                    <span className="activity-time">15 minutes ago</span>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-icon">🎯</div>
                  <div className="activity-content">
                    <p className="activity-text">Meeting started: Weekly Standup</p>
                    <span className="activity-time">1 hour ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'account-management':
        return <UserManagement />;

      case 'role-access':
        return <RoleAccessManagement />;

      default:
        return <div>Menu tidak ditemukan</div>;
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <AdminSidebar 
        activeMenu={activeMenu} 
        onMenuChange={handleMenuChange} 
      />

      {/* Main Content */}
      <div className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <h1>
              {activeMenu === 'dashboard' ? 'Dashboard' : 
               activeMenu === 'account-management' ? 'Management Akun' :
               activeMenu === 'role-access' ? 'Role Access Management' : 'Dashboard'}
            </h1>
            <p>
              {activeMenu === 'dashboard' ? 'Overview & Statistics' : 
               activeMenu === 'account-management' ? 'User & Role Management' :
               activeMenu === 'role-access' ? 'Menu Access Control' : 'Overview & Statistics'}
            </p>
          </div>
          <div className="header-right">
            <div className="user-info">
              <span className="user-avatar">👤</span>
              <span className="user-name">Administrator</span>
            </div>
          </div>
        </header>

        {/* Content */}
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;
