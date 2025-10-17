
import React from "react";

export default function UserFormModal({
  editingUser,
  formData,
  roles,
  handleSubmit,
  handleCancel,
  handleInputChange,
}) {
  const labelRole = (n) => n.charAt(0).toUpperCase() + n.slice(1);
  return (
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
              {roles.map((r) => (
                <option key={r.userRoleId} value={r.userRoleId}>
                  {labelRole(r.nama)}
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
  );
}
