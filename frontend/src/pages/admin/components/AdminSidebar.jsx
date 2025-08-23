import React, { useState } from 'react';
import './AdminSidebar.css';

const AdminSidebar = ({ activeMenu, onMenuChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const menuItems = [
    { 
      id: 'dashboard', 
      name: 'Dashboard', 
      icon: '📊',
      description: 'Overview & Statistics'
    },
    { 
      id: 'account-management', 
      name: 'Management Akun', 
      icon: '👥',
      description: 'User & Role Management'
    },
    { 
      id: 'role-access', 
      name: 'Role Access', 
      icon: '🔐',
      description: 'Menu Access Control'
    }
  ];

  const handleMenuClick = (menuId) => {
    onMenuChange(menuId);
    // Close sidebar on mobile when menu is clicked
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <div className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/img/logo.png" alt="Logo" className="logo-img" />
          <span className="logo-text">Admin Panel</span>
        </div>
        <button 
          className="sidebar-toggle"
          onClick={toggleSidebar}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        <ul className="nav-menu">
          {menuItems.map((item) => (
            <li key={item.id} className="nav-item">
              <button
                className={`nav-link ${activeMenu === item.id ? 'active' : ''}`}
                onClick={() => handleMenuClick(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <div className="nav-content">
                  <span className="nav-text">{item.name}</span>
                  <span className="nav-description">{item.description}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <span className="logout-icon">🚪</span>
          <span className="logout-text">Logout</span>
        </button>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="mobile-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}
    </div>
  );
};

export default AdminSidebar;
