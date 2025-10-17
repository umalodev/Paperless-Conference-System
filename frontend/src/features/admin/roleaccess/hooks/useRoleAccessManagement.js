import { useState, useEffect, useMemo } from "react";
import { API_URL } from "../../../../config.js";
import meetingService from "../../../../services/meetingService";

export default function useRoleAccessManagement() {
  const [roles, setRoles] = useState([]);
  const [menus, setMenus] = useState([]);
  const [roleMenus, setRoleMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [rolesRes, menusRes, rmRes] = await Promise.all([
        fetch(`${API_URL}/api/users/roles`, { headers: meetingService.getAuthHeaders() }),
        fetch(`${API_URL}/api/menu`, { headers: meetingService.getAuthHeaders() }),
        fetch(`${API_URL}/api/menu/role-access`, { headers: meetingService.getAuthHeaders() }),
      ]);

      if (!rolesRes.ok || !menusRes.ok || !rmRes.ok)
        throw new Error("Fetch failed");

      const [rolesJson, menusJson, rmJson] = await Promise.all([
        rolesRes.json(),
        menusRes.json(),
        rmRes.json(),
      ]);

      setRoles(rolesJson.roles || []);
      setMenus(menusJson.menus || []);
      setRoleMenus(rmJson.roleMenus || []);
    } catch (err) {
      console.error("Error fetching role access data:", err);
      setError("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  // ===== Normalisasi & Map akses =====
  const accessMap = useMemo(() => {
    const map = new Map();
    for (const rm of roleMenus) {
      if (rm.flag !== "Y") continue;
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

  // ===== CRUD Access Toggle =====
  const handleMenuToggle = async (roleId, menuId, hasAccess) => {
    try {
      const method = hasAccess ? "DELETE" : "POST";
      const url = hasAccess
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
            ? JSON.stringify({ userRoleId: roleId, menuId, flag: "Y" })
            : undefined,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchData();
    } catch (err) {
      console.error("Error updating menu access:", err);
      setError("Gagal mengupdate akses menu");
    }
  };

  const handleBulkGrantAccess = async (roleId) => {
    try {
      const allMenuIds = menus.map((m) => m.menuId);
      const granted = Array.from(accessMap.get(String(roleId)) ?? []);
      const missing = allMenuIds.filter((id) => !granted.includes(String(id)));
      if (!missing.length) return;

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
    } catch (err) {
      console.error("Error bulk grant:", err);
      setError("Gagal grant semua akses");
    }
  };

  const handleBulkRevokeAccess = async (roleId) => {
    try {
      const granted = Array.from(accessMap.get(String(roleId)) ?? []);
      if (!granted.length) return;

      const res = await fetch(`${API_URL}/api/menu/role-access/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
        body: JSON.stringify({
          userRoleId: roleId,
          menuIds: granted.map(Number),
          action: "revoke",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchData();
    } catch (err) {
      console.error("Error bulk revoke:", err);
      setError("Gagal revoke semua akses");
    }
  };

  const ORDER = ["participant", "host", "assist", "admin"];
  const normalize = (s) => (s || "").toLowerCase().trim();

  const orderedRoles = useMemo(() => {
    return [...roles].sort((a, b) => {
      const ai = ORDER.indexOf(normalize(a.nama));
      const bi = ORDER.indexOf(normalize(b.nama));
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [roles]);

  return {
    loading,
    error,
    orderedRoles,
    menus,
    hasMenuAccess,
    getMenuAccessCount,
    handleMenuToggle,
    handleBulkGrantAccess,
    handleBulkRevokeAccess,
  };
}
