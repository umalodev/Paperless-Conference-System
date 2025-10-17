import React from "react";
import "../styles/UserManagement.css";
import useUserManagement from "../hooks/useUserManagement";
import UserStats from "../components/UserStats";
import UserFormModal from "../components/UserFormModal";
import UserTable from "../components/UserTable";

export default function UserManagement() {
  const {
    users,
    roles,
    loading,
    error,
    isAuthenticated,
    showAddForm,
    editingUser,
    formData,
    countByRole,
    handleEdit,
    handleCancel,
    handleSubmit,
    handleInputChange,
    deleteUser,
    setShowAddForm,
  } = useUserManagement();

  if (!isAuthenticated && !loading)
    return (
      <div className="user-management">
        <div className="error-message">
          {error}
          <br />
          <button
            className="btn-primary"
            onClick={() => (window.location.href = "/login")}
          >
            Login Sekarang
          </button>
        </div>
      </div>
    );

  if (loading) return <div className="loading">Loading users...</div>;

  return (
    <div className="user-management">
      {error && <div className="error-message">{error}</div>}

      <UserStats users={users} countByRole={countByRole} />

      <div className="button-container">
        <button
          className="btn-primary add-user-btn"
          onClick={() => setShowAddForm(true)}
        >
          👤 Add New User
        </button>
      </div>

      {showAddForm && (
        <UserFormModal
          editingUser={editingUser}
          formData={formData}
          roles={roles}
          handleSubmit={handleSubmit}
          handleCancel={handleCancel}
          handleInputChange={handleInputChange}
        />
      )}

      <UserTable users={users} handleEdit={handleEdit} deleteUser={deleteUser} />
    </div>
  );
}
