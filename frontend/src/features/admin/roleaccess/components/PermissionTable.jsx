import React from "react";

export default function PermissionTable({
  orderedRoles,
  menus,
  hasMenuAccess,
  handleMenuToggle,
}) {
  return (
    <div className="permissions-table">
      <table
        style={{
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
  );
}
