import React, { useState, useEffect, useMemo } from "react";
import "./RoleAccessManagement.css";
import { API_URL } from "../../../config";

const RoleAccessManagement = () => {
  const [roles, setRoles] = useState([]);
  const [menus, setMenus] = useState([]);
  const [roleMenus, setRoleMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      // roles
      const rolesRes = await fetch(`${API_URL}/api/users/roles`, {
        credentials: "include",
      });
      if (!rolesRes.ok) throw new Error(`Roles HTTP ${rolesRes.status}`);
      const rolesJson = await rolesRes.json();
      setRoles(Array.isArray(rolesJson.roles) ? rolesJson.roles : []);

      // menus (aktif)
      const menusRes = await fetch(`${API_URL}/api/menu`, {
        credentials: "include",
      });
      if (!menusRes.ok) throw new Error(`Menus HTTP ${menusRes.status}`);
      const menusJson = await menusRes.json();
      setMenus(Array.isArray(menusJson.menus) ? menusJson.menus : []);

      // role-menu (relasi akses)
      const rmRes = await fetch(`${API_URL}/api/menu/role-access`, {
        credentials: "include",
      });
      if (!rmRes.ok) throw new Error(`RoleMenus HTTP ${rmRes.status}`);
      const rmJson = await rmRes.json();
      setRoleMenus(Array.isArray(rmJson.roleMenus) ? rmJson.roleMenus : []);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setShowEditForm(true);
  };

  // ====== Normalisasi & Map Akses (INTI PERBAIKAN) ======
  // Buat map: roleId(string) -> Set(menuId(string)) untuk flag = 'Y'
  const accessMap = useMemo(() => {
    const map = new Map();
    for (const rm of roleMenus) {
      if (rm?.flag !== "Y") continue;
      const rKey = String(rm.userRoleId);
      const mKey = String(rm.menuId);
      if (!map.has(rKey)) map.set(rKey, new Set());
      map.get(rKey).add(mKey);
    }
    return map;
  }, [roleMenus]);

  const hasMenuAccess = (roleId, menuId) => {
    const set = accessMap.get(String(roleId));
    return !!(set && set.has(String(menuId)));
  };
  const getMenuAccessCount = (roleId) =>
    accessMap.get(String(roleId))?.size ?? 0;
  // =====================================================

  const handleMenuToggle = async (menuId, currentlyHasAccess) => {
    if (!selectedRole) return;

    try {
      const method = currentlyHasAccess ? "DELETE" : "POST";
      const url = currentlyHasAccess
        ? `${API_URL}/api/menu/role-access/${selectedRole.userRoleId}/${menuId}`
        : `${API_URL}/api/menu/role-access`;

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body:
          method === "POST"
            ? JSON.stringify({
                userRoleId: selectedRole.userRoleId,
                menuId,
                flag: "Y",
              })
            : undefined,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchData();
    } catch (err) {
      console.error("Error updating menu access:", err);
      setError("Gagal mengupdate akses menu");
    }
  };

  // Bulk ops (tetap sama, hanya panggil fetchData setelahnya)
  const handleBulkGrantAccess = async (menuIds) => {
    if (!selectedRole || !menuIds?.length) return;
    try {
      const res = await fetch(`${API_URL}/api/menu/role-access/bulk`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userRoleId: selectedRole.userRoleId,
          menuIds,
          action: "grant",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchData();
    } catch (err) {
      console.error("Error bulk granting access:", err);
      setError("Gagal melakukan bulk grant access");
    }
  };

  const handleBulkRevokeAccess = async (menuIds) => {
    if (!selectedRole || !menuIds?.length) return;
    try {
      const res = await fetch(`${API_URL}/api/menu/role-access/bulk`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userRoleId: selectedRole.userRoleId,
          menuIds,
          action: "revoke",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchData();
    } catch (err) {
      console.error("Error bulk revoking access:", err);
      setError("Gagal melakukan bulk revoke access");
    }
  };

  const handleSelectAllMenus = () => {
    if (!selectedRole) return;
    const allMenuIds = menus.map((m) => m.menuId);
    const granted = Array.from(
      accessMap.get(String(selectedRole.userRoleId)) ?? []
    );
    const missing = allMenuIds.filter((id) => !granted.includes(String(id)));
    if (missing.length) handleBulkGrantAccess(missing);
  };

  const handleRevokeAllMenus = () => {
    if (!selectedRole) return;
    const granted = Array.from(
      accessMap.get(String(selectedRole.userRoleId)) ?? []
    );
    if (granted.length) handleBulkRevokeAccess(granted.map((x) => Number(x)));
  };

  if (loading)
    return <div className="loading">Loading role access data...</div>;

  return (
    <div className="role-access-management">
      <div className="section-header">
        <h2>Role Access Management</h2>
        <p>Kelola akses menu untuk setiap role</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Roles Overview */}
      <div className="roles-overview">
        <h3>Roles Overview</h3>
        <div className="roles-grid">
          {roles.map((role) => (
            <div key={role.userRoleId} className="role-card">
              <div className="role-header">
                <h4>
                  {role.nama?.charAt(0).toUpperCase() + role.nama?.slice(1)}
                </h4>
                <span className="access-count">
                  {getMenuAccessCount(role.userRoleId)} menus
                </span>
              </div>
              <p className="role-description">
                {role.nama === "admin" && "Full access to all features"}
                {role.nama === "host" &&
                  "Access to most features including recording and screen sharing"}
                {role.nama === "participant" &&
                  "Basic access to files, chat, and materials"}
              </p>
              <button
                className="btn-edit-access"
                onClick={() => handleRoleSelect(role)}
              >
                Edit Access
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Role Access Modal */}
      {showEditForm && selectedRole && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                Edit Access for{" "}
                {selectedRole.nama?.charAt(0).toUpperCase() +
                  selectedRole.nama?.slice(1)}
              </h3>
              <button
                className="close-btn"
                onClick={() => {
                  setShowEditForm(false);
                  setSelectedRole(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {/* Bulk Actions */}
              <div className="bulk-actions">
                <button
                  className="btn-bulk-action grant-all"
                  onClick={handleSelectAllMenus}
                >
                  Grant All Access
                </button>
                <button
                  className="btn-bulk-action revoke-all"
                  onClick={handleRevokeAllMenus}
                >
                  Revoke All Access
                </button>
              </div>

              <div className="menu-access-list">
                {menus.map((menu) => {
                  const checked = hasMenuAccess(
                    selectedRole.userRoleId,
                    menu.menuId
                  );
                  return (
                    <div key={menu.menuId} className="menu-access-item">
                      <div className="menu-info">
                        <span className="menu-label">{menu.displayLabel}</span>
                        <span className="menu-slug">({menu.slug})</span>
                      </div>
                      <div className="access-controls">
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              handleMenuToggle(menu.menuId, checked)
                            }
                          />
                          <span className="slider"></span>
                        </label>
                        <span className="access-status">
                          {checked ? "Access Granted" : "Access Denied"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowEditForm(false);
                  setSelectedRole(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Access Matrix */}
      <div className="access-matrix">
        <h3>Current Access Matrix</h3>
        <div className="matrix-table">
          <table>
            <thead>
              <tr>
                <th>Menu</th>
                {roles.map((role) => (
                  <th key={role.userRoleId}>
                    {role.nama?.charAt(0).toUpperCase() + role.nama?.slice(1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {menus.map((menu) => (
                <tr key={menu.menuId}>
                  <td className="menu-name">
                    <strong>{menu.displayLabel}</strong>
                    <br />
                    <small>{menu.slug}</small>
                  </td>
                  {roles.map((role) => (
                    <td key={role.userRoleId} className="access-cell">
                      {hasMenuAccess(role.userRoleId, menu.menuId) ? (
                        <span className="access-granted">✓</span>
                      ) : (
                        <span className="access-denied">✗</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RoleAccessManagement;
