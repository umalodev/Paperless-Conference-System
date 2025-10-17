import React from "react";

export default function RoleCardList({
  orderedRoles,
  getMenuAccessCount,
  handleBulkGrantAccess,
  handleBulkRevokeAccess,
}) {
  return (
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
            {role.nama === "participant" && "Basic access to files, chat, and materials"}
            {role.nama === "assist" && "Access to assist participants during the conference"}
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
              🔓 Revoke All
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
