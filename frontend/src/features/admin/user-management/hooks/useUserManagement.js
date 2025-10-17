import { useState, useEffect } from "react";
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService";

export default function useUserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([
    { userRoleId: 1, nama: "participant" },
    { userRoleId: 2, nama: "host" },
    { userRoleId: 3, nama: "admin" },
    { userRoleId: 4, nama: "assist" },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
      if (!userData) throw new Error("Not logged in");

      const user = JSON.parse(userData);
      if (!user?.id) throw new Error("Invalid session");

      setIsAuthenticated(true);
      await Promise.all([fetchRolesSafe(), fetchUsers()]);
    } catch (err) {
      setIsAuthenticated(false);
      setError(err.message || "Autentikasi gagal");
    } finally {
      setLoading(false);
    }
  };

  const fetchRolesSafe = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/roles`, {
        headers: meetingService.getAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      const rows = Array.isArray(data?.data || data?.roles)
        ? data.data || data.roles
        : [];
      const normalized = rows
        .map((r) => ({
          userRoleId: r.userRoleId ?? r.id ?? r.user_role_id,
          nama: String(r.nama || r.name || "").toLowerCase(),
        }))
        .filter((r) => r.userRoleId && r.nama);
      if (normalized.length) {
        const hasAssist = normalized.some((r) => r.nama === "assist");
        setRoles(
          hasAssist ? normalized : [...normalized, { userRoleId: 4, nama: "assist" }]
        );
      }
    } catch (e) {
      console.warn("Fetch roles failed:", e);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/users`, {
        headers: meetingService.getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) setUsers(data.users || []);
      else setError(data.message || "Gagal memuat users");
    } catch (err) {
      setError("Gagal memuat data users");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({
      ...p,
      [name]: name === "userRoleId" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      editingUser ? await updateUser(editingUser.id, formData) : await addUser(formData);
      setShowAddForm(false);
      setEditingUser(null);
      setFormData({ username: "", password: "", userRoleId: "" });
      fetchUsers();
    } catch {
      setError("Gagal menyimpan user");
    }
  };

  const addUser = async (data) => {
    const res = await fetch(`${API_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...meetingService.getAuthHeaders() },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
  };

  const updateUser = async (id, data) => {
    const res = await fetch(`${API_URL}/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...meetingService.getAuthHeaders() },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Yakin hapus user ini?")) return;
    const res = await fetch(`${API_URL}/api/users/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...meetingService.getAuthHeaders() },
    });
    const json = await res.json();
    if (json.success) setUsers((u) => u.filter((x) => x.id !== id));
  };

  const handleEdit = (user) => {
    const roleObj = roles.find(
      (r) => r.nama.toLowerCase() === String(user.role).toLowerCase()
    );
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: "",
      userRoleId: roleObj ? roleObj.userRoleId : "",
    });
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingUser(null);
    setFormData({ username: "", password: "", userRoleId: "" });
  };

  const countByRole = (roleName) =>
    users.filter(
      (u) => String(u.role).toLowerCase() === String(roleName).toLowerCase()
    ).length;

  return {
    users,
    roles,
    loading,
    error,
    isAuthenticated,
    showAddForm,
    editingUser,
    formData,
    setShowAddForm,
    handleSubmit,
    handleEdit,
    handleCancel,
    handleInputChange,
    deleteUser,
    countByRole,
  };
}
