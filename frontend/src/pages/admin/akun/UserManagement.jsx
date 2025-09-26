import React, { useState, useEffect } from "react";
import "./UserManagement.css";
import { API_URL } from "../../../config";
import meetingService from "../../../services/meetingService";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([
    // Fallback default (akan di-override jika fetch roles berhasil)
    { userRoleId: 1, nama: "participant" },
    { userRoleId: 2, nama: "host" },
    { userRoleId: 3, nama: "admin" },
    { userRoleId: 4, nama: "assist" }, // NEW: fallback assist
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    userRoleId: "",
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      setLoading(true);
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        if (user && user.id) {
          setIsAuthenticated(true);

          // opsional verify session
          try {
            const sessionResponse = await fetch(`${API_URL}/api/auth/me`, {
              method: "GET",
              headers: meetingService.getAuthHeaders(),
            });
            if (sessionResponse.status === 401) {
              localStorage.removeItem("user");
              setIsAuthenticated(false);
              setError("Sesi Anda telah berakhir. Silakan login ulang.");
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn("Session check failed, continue anyway:", e);
          }

          await Promise.all([fetchRolesSafe(), fetchUsers()]);
          setLoading(false);
          return;
        }
      }
      setIsAuthenticated(false);
      setError(
        "Anda harus login terlebih dahulu. Silakan login untuk mengakses halaman ini."
      );
    } catch (err) {
      console.error("Error checking auth:", err);
      setIsAuthenticated(false);
      setError("Gagal memeriksa status autentikasi. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // NEW: coba ambil daftar role dari backend (kalau ada), fallback ke default
  const fetchRolesSafe = async () => {
    try {
      // SESUAIKAN endpoint jika sudah ada (contoh: /api/users/roles atau /api/user-roles)
      const res = await fetch(`${API_URL}/api/users/roles`, {
        headers: meetingService.getAuthHeaders(),
      });
      if (!res.ok) return; // fallback ke default
      const data = await res.json();
      const rows = Array.isArray(data?.data || data?.roles)
        ? data.data || data.roles
        : [];
      // Pastikan nama dan id tersedia, dan include 'assist'
      const normalized = rows
        .map((r) => ({
          userRoleId: r.userRoleId ?? r.id ?? r.user_role_id,
          nama: String(r.nama || r.name || "").toLowerCase(),
        }))
        .filter((r) => r.userRoleId && r.nama);
      if (normalized.length) {
        // Jika assist belum ada di data server (kasus lama), tambahkan manual
        const hasAssist = normalized.some((r) => r.nama === "assist");
        const next = hasAssist
          ? normalized
          : [...normalized, { userRoleId: 4, nama: "assist" }];
        setRoles(next);
      }
    } catch (e) {
      console.warn("Fetch roles failed, using fallback:", e);
      // fallback roles yang sudah di-state
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/users`, {
        method: "GET",
        headers: meetingService.getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUsers(data.users || []);
          setError("");
        } else {
          setError(data.message || "Gagal memuat data users");
        }
      } else if (response.status === 401) {
        setIsAuthenticated(false);
        setError("Sesi Anda telah berakhir. Silakan login ulang.");
      } else {
        setError("Gagal memuat data users dari server");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Gagal memuat data users");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Pastikan userRoleId disimpan sebagai number (bukan string)
    setFormData((prev) => ({
      ...prev,
      [name]: name === "userRoleId" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateUser(editingUser.id, formData);
      } else {
        await addUser(formData);
      }
      setShowAddForm(false);
      setEditingUser(null);
      setFormData({ username: "", password: "", userRoleId: "" });
      fetchUsers();
    } catch (err) {
      console.error("Error saving user:", err);
      setError("Gagal menyimpan user");
    }
  };

  const addUser = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
        body: JSON.stringify({
          username: userData.username,
          password: userData.password,
          userRoleId: Number(userData.userRoleId), // pastikan number
        }),
      });

      const data = await response.json();
      if (data.success) {
        setUsers((prev) => [...prev, data.user]);
        setError("");
      } else {
        setError(data.message || "Gagal membuat user");
        throw new Error(data.message);
      }
    } catch (err) {
      console.error("Error creating user:", err);
      setError("Gagal membuat user");
      throw err;
    }
  };

  const updateUser = async (userId, userData) => {
    try {
      const payload = {
        username: userData.username,
        userRoleId: Number(userData.userRoleId),
      };
      if (userData.password) payload.password = userData.password;

      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        setUsers((prev) =>
          prev.map((user) => (user.id === userId ? data.user : user))
        );
        setError("");
      } else {
        setError(data.message || "Gagal mengupdate user");
        throw new Error(data.message);
      }
    } catch (err) {
      console.error("Error updating user:", err);
      setError("Gagal mengupdate user");
      throw err;
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus user ini?")) {
      try {
        const response = await fetch(`${API_URL}/api/users/${userId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...meetingService.getAuthHeaders(),
          },
        });

        const data = await response.json();
        if (data.success) {
          setUsers((prev) => prev.filter((user) => user.id !== userId));
          setError("");
        } else {
          setError(data.message || "Gagal menghapus user");
        }
      } catch (err) {
        console.error("Error deleting user:", err);
        setError("Gagal menghapus user");
      }
    }
  };

  const handleEdit = (user) => {
    // Cari roleId berdasarkan nama role yang ada di user (user.role)
    const roleObj = roles.find(
      (r) => r.nama.toLowerCase() === String(user.role).toLowerCase()
    );
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: "",
      userRoleId: roleObj ? roleObj.userRoleId : "", // fallback kosong jika tak ketemu
    });
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingUser(null);
    setFormData({ username: "", password: "", userRoleId: "" });
  };

  // Helper untuk kapitalisasi label role
  const labelRole = (nama) =>
    (nama?.charAt(0).toUpperCase() || "") + (nama?.slice(1) || "");

  // Hitung stat dinamis
  const countByRole = (roleName) =>
    users.filter(
      (u) => String(u.role).toLowerCase() === String(roleName).toLowerCase()
    ).length;

  // UI

  if (!isAuthenticated && !loading) {
    return (
      <div className="user-management">
        <div className="section-header">
          <h2>User Management</h2>
        </div>
        <div className="error-message">
          {error}
          <br />
          <button
            className="btn-primary"
            onClick={() => (window.location.href = "/login")}
            style={{ marginTop: "10px" }}
          >
            Login Sekarang
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="user-management">
      {error && <div className="error-message">{error}</div>}

      {/* UPDATED: Tambah kartu Assist */}
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

      <div className="button-container">
        <button
          className="btn-primary add-user-btn"
          onClick={() => setShowAddForm(true)}
        >
          <span className="btn-icon">👤</span>
          Add New User
        </button>
      </div>

      {/* Add/Edit User Form */}
      {showAddForm && (
        <div className="form-overlay">
          <div className="form-modal">
            <h3>{editingUser ? "Edit User" : "Add New User"}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Username:</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password:</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!editingUser}
                  placeholder={editingUser ? "Leave blank to keep current" : ""}
                />
              </div>

              <div className="form-group">
                <label>Role:</label>
                <select
                  name="userRoleId"
                  value={formData.userRoleId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role.userRoleId} value={role.userRoleId}>
                      {labelRole(role.nama)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingUser ? "Update User" : "Add User"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const roleLower = String(user.role).toLowerCase();
              return (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>
                    <span className={`role-badge role-${roleLower}`}>
                      {roleLower}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${user.status}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(user)}
                        title="Edit User"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => deleteUser(user.id)}
                        title="Delete User"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
