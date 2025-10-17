import React, { useState } from "react";
import "../styles/admin-sidebar.css";
import { useModal } from "../../../../contexts/ModalProvider.jsx"; 

const AdminSidebar = ({ activeMenu, onMenuChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { confirm, notify } = useModal(); // modal context
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const menuItems = [
    { id: "dashboard", name: "Dashboard", icon: "📊" },
    { id: "account-management", name: "User Management", icon: "⚙️" },
    { id: "role-access", name: "Role Access", icon: "👤" },
  ];

  const handleMenuClick = (menuId) => {
    onMenuChange(menuId);
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: "Konfirmasi Logout",
      message: "Apakah Anda yakin ingin keluar dari akun ini?",
      okText: "Ya, Logout",
      cancelText: "Batal",
      destructive: true, // tombol merah
    });

    if (confirmed) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");

      await notify({
        variant: "success",
        title: "Berhasil Logout",
        message: "Anda telah keluar dari akun.",
        autoCloseMs: 1500,
      });

        window.location.href = "/";
    }
  };

  return (
    <div className={`admin-sidebar ${sidebarOpen ? "open" : "closed"}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/img/logo.png" alt="Umalo Logo" className="umalo-logo" />
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        <ul className="nav-menu">
          {menuItems.map((item) => (
            <li key={item.id} className="nav-item">
              <button
                className={`nav-link ${
                  activeMenu === item.id ? "active" : ""
                }`}
                onClick={() => handleMenuClick(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-text">{item.name}</span>
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
        <div
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default AdminSidebar;
