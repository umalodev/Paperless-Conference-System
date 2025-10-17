import React from "react";
import "../styles/RoleAccessManagement.css";
import useRoleAccessManagement from "../hooks/useRoleAccessManagement";
import RoleCardList from "../components/RoleCardList";
import PermissionTable from "../components/PermissionTable";

export default function RoleAccessManagement() {
  const {
    loading,
    error,
    orderedRoles,
    menus,
    getMenuAccessCount,
    hasMenuAccess,
    handleMenuToggle,
    handleBulkGrantAccess,
    handleBulkRevokeAccess,
  } = useRoleAccessManagement();

  if (loading) return <div className="loading">Loading role access data...</div>;

  return (
    <div className="role-access-management">
      {error && <div className="error-message">{error}</div>}

      <RoleCardList
        orderedRoles={orderedRoles}
        getMenuAccessCount={getMenuAccessCount}
        handleBulkGrantAccess={handleBulkGrantAccess}
        handleBulkRevokeAccess={handleBulkRevokeAccess}
      />

      <PermissionTable
        orderedRoles={orderedRoles}
        menus={menus}
        hasMenuAccess={hasMenuAccess}
        handleMenuToggle={handleMenuToggle}
      />
    </div>
  );
}
