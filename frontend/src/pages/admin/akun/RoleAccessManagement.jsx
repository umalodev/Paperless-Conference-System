import React, { useState, useEffect, useMemo } from "react";
import "./RoleAccessManagement.css";
import { API_URL } from "../../../config";
import meetingService from "../../../services/meetingService";

const RoleAccessManagement = () => {
  const [roles, setRoles] = useState([]);
  const [menus, setMenus] = useState([]);
  const [roleMenus, setRoleMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      // roles
      const rolesRes = await fetch(`${API_URL}/api/users/roles`, {
        headers: meetingService.getAuthHeaders(),
      });
      if (!rolesRes.ok) throw new Error(`Roles HTTP ${rolesRes.status}`);
      const rolesJson = await rolesRes.json();
      setRoles(Array.isArray(rolesJson.roles) ? rolesJson.roles : []);

      // menus (aktif)
      const menusRes = await fetch(`${API_URL}/api/menu`, {
        headers: meetingService.getAuthHeaders(),
      });
      if (!menusRes.ok) throw new Error(`Menus HTTP ${menusRes.status}`);
      const menusJson = await menusRes.json();
      setMenus(Array.isArray(menusJson.menus) ? menusJson.menus : []);

      // role-menu (relasi akses)
      const rmRes = await fetch(`${API_URL}/api/menu/role-access`, {
        headers: meetingService.getAuthHeaders(),
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
    setSelectedRole(selectedRole?.userRoleId === role.userRoleId ? null : role);
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

  const handleMenuToggle = async (roleId, menuId, currentlyHasAccess) => {
    try {
      const method = currentlyHasAccess ? "DELETE" : "POST";
      const url = currentlyHasAccess
        ? `${API_URL}/api/menu/role-access/${roleId}/${menuId}`
        : `${API_URL}/api/menu/role-access`;

      const res = await fetch(url, {
        method,

        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
        body:
          method === "POST"
            ? JSON.stringify({
                userRoleId: roleId,
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
  const handleBulkGrantAccess = async (roleId) => {
    try {
      const allMenuIds = menus.map((m) => m.menuId);
      const granted = Array.from(accessMap.get(String(roleId)) ?? []);
      const missing = allMenuIds.filter((id) => !granted.includes(String(id)));

      if (missing.length) {
        const res = await fetch(`${API_URL}/api/menu/role-access/bulk`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...meetingService.getAuthHeaders(),
          },
          body: JSON.stringify({
            userRoleId: roleId,
            menuIds: missing,
            action: "grant",
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await fetchData();
      }
    } catch (err) {
      console.error("Error bulk granting access:", err);
      setError("Gagal melakukan bulk grant access");
    }
  };

  const handleBulkRevokeAccess = async (roleId) => {
    try {
      const granted = Array.from(accessMap.get(String(roleId)) ?? []);

      if (granted.length) {
        const res = await fetch(`${API_URL}/api/menu/role-access/bulk`, {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            ...meetingService.getAuthHeaders(),
          },
          body: JSON.stringify({
            userRoleId: roleId,
            menuIds: granted.map((x) => Number(x)),
            action: "revoke",
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await fetchData();
      }
    } catch (err) {
      console.error("Error bulk revoking access:", err);
      setError("Gagal melakukan bulk revoke access");
    }
  };

  const normalize = (s) => (s || "").toLowerCase().trim();
  const ORDER = ["participant", "host", "assist", "admin"]; // urutan yang diinginkan

  const orderedRoles = useMemo(() => {
    return [...roles].sort((a, b) => {
      const ai = ORDER.indexOf(normalize(a.nama));
      const bi = ORDER.indexOf(normalize(b.nama));
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [roles]);

  if (loading)
    return <div className="loading">Loading role access data...</div>;

  return (
    <div className="role-access-management">
      {error && <div className="error-message">{error}</div>}

      {/* Role Cards */}
      <div className="role-cards">
        {orderedRoles.map((role) => (
          <div key={role.userRoleId} className="role-card">
            <div className="role-header">
              <h3>
                {role.nama?.charAt(0).toUpperCase() + role.nama?.slice(1)}
              </h3>
              <span className="menu-badge">
                {getMenuAccessCount(role.userRoleId)} Menu
              </span>
            </div>
            <p className="role-description">
              {role.nama === "admin" && "Full access to all features"}
              {role.nama === "host" && "Access to most features"}
              {role.nama === "participant" &&
                "Basic access to files, chat, and materials"}
            </p>
            <div className="role-actions">
              <button
                className="btn-grant-all"
                onClick={() => handleBulkGrantAccess(role.userRoleId)}
              >
                🔒 Grant All
              </button>
              <button
                className="btn-revoke-all"
                onClick={() => handleBulkRevokeAccess(role.userRoleId)}
              >
                🔒 Revoke All
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Permissions Table */}
      <div className="permissions-table">
        <table
          style={{
            // 1 kolom "Menu" ~ 220px + tiap role ~ 160px
            minWidth: `${220 + orderedRoles.length * 160}px`,
            tableLayout: "auto",
          }}
        >
          <thead>
            <tr>
              <th>Menu</th>
              {orderedRoles.map((role) => (
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
                </td>
                {orderedRoles.map((role) => {
                  const hasAccess = hasMenuAccess(role.userRoleId, menu.menuId);
                  return (
                    <td key={role.userRoleId} className="access-cell">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={hasAccess}
                          onChange={() =>
                            handleMenuToggle(
                              role.userRoleId,
                              menu.menuId,
                              hasAccess
                            )
                          }
                        />
                        <span className="slider"></span>
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RoleAccessManagement;
