import React, { useState, useEffect } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import UserManagement from '../akun/UserManagement.jsx';
import RoleAccessManagement from '../akun/RoleAccessManagement.jsx';
import DashboardService from '../../../services/dashboardService';
import './admin-dashboard.css';

const AdminDashboard = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    activeMeetings: 0,
    totalMeetings: 0,
    totalFiles: 0,
    systemStatus: 'offline',
    recentActivities: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState({ time: '00:00', date: 'Monday, 01/01/2024' });

  const handleMenuChange = (menuId) => {
    setActiveMenu(menuId);
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await DashboardService.getDashboardStats();
      
      if (response.success) {
        setDashboardData(response.data);
      } else {
        setError(response.message || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Update time and date
  const updateTimeAndDate = () => {
    const timeData = DashboardService.getCurrentTimeAndDate();
    setCurrentTime(timeData);
  };

  // Load data on component mount and set up polling
  useEffect(() => {
    fetchDashboardData();
    updateTimeAndDate();
    
    // Update time every minute
    const timeInterval = setInterval(updateTimeAndDate, 60000);
    
    // Refresh dashboard data every 30 seconds (without loading state)
    const dataInterval = setInterval(() => {
      fetchDashboardDataSilently();
    }, 30000);
    
    return () => {
      clearInterval(timeInterval);
      clearInterval(dataInterval);
    };
  }, []);

  // Silent fetch for polling (without loading state)
  const fetchDashboardDataSilently = async () => {
    try {
      const response = await DashboardService.getDashboardStats();
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data silently:', err);
    }
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return (
          <div className="dashboard-content">
            {/* Loading State */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p>Loading dashboard data...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
                <p>Error: {error}</p>
                <button onClick={fetchDashboardData} style={{ marginTop: '10px', padding: '8px 16px' }}>
                  Retry
                </button>
              </div>
            )}

            {/* Stats Section */}
            {!loading && !error && (
              <div className="stats-section">
                <div className="stat-card">
                  <h3>Total Users</h3>
                  <p className="stat-number">{dashboardData.totalUsers}</p>
                </div>
                <div className="stat-card">
                  <h3>Active Meetings</h3>
                  <p className="stat-number">{dashboardData.activeMeetings}</p>
                </div>
                <div className="stat-card">
                  <h3>Total Files</h3>
                  <p className="stat-number">{dashboardData.totalFiles}</p>
                </div>
                <div className="stat-card">
                  <h3>System Status</h3>
                  <p className={`stat-status ${dashboardData.systemStatus}`}>
                    {dashboardData.systemStatus}
                  </p>
                </div>
              </div>
            )}


            {/* Recent Actions */}
            {!loading && !error && (
              <div className="recent-actions">
                <h2>Recent Actions</h2>
                <div className="activity-list">
                  {dashboardData.recentActivities.length > 0 ? (
                    dashboardData.recentActivities.map((activity, index) => (
                      <div key={index} className="activity-item">
                        <div className="activity-icon">{activity.icon}</div>
                        <div className="activity-content">
                          <p className="activity-text">{activity.text}</p>
                          <span className="activity-time">{activity.time}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="activity-item">
                      <div className="activity-icon">📊</div>
                      <div className="activity-content">
                        <p className="activity-text">No recent activities</p>
                        <span className="activity-time">-</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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
               activeMenu === 'account-management' ? 'User Management' :
               activeMenu === 'role-access' ? 'Role Access' : 'Dashboard'}
            </h1>
            <p>
              {activeMenu === 'dashboard' ? 'Overview & Statistics' : 
               activeMenu === 'account-management' ? 'User & Role Management' :
               activeMenu === 'role-access' ? 'Menu Access Control' : 'Overview & Statistics'}
            </p>
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

        {/* Content */}
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;
