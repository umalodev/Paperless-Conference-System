import React from "react";

export default function RoleHeaderStats({ roles, menus, roleMenus }) {
  const totalRoles = roles?.length || 0;
  const totalMenus = menus?.length || 0;
  const totalAccess = roleMenus?.filter((rm) => rm.flag === "Y").length || 0;

  return (
    <div className="role-header-stats">
      <div className="stat-card">
        <h3>Total Roles</h3>
        <p className="stat-number">{totalRoles}</p>
      </div>
      <div className="stat-card">
        <h3>Total Menus</h3>
        <p className="stat-number">{totalMenus}</p>
      </div>
      <div className="stat-card">
        <h3>Active Access Links</h3>
        <p className="stat-number">{totalAccess}</p>
      </div>
    </div>
  );
}
