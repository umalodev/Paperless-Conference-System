import React, { useState, useEffect } from 'react';
import './RoleAccessManagement.css';
import { API_URL } from '../../../config';

const RoleAccessManagement = () => {
  const [roles, setRoles] = useState([]);
  const [menus, setMenus] = useState([]);
  const [roleMenus, setRoleMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch roles
      const rolesResponse = await fetch(`${API_URL}/api/users/roles`, {
        credentials: 'include'
      });
      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        setRoles(rolesData.roles || []);
      }

      // Fetch menus
      const menusResponse = await fetch(`${API_URL}/api/menu`, {
        credentials: 'include'
      });
      if (menusResponse.ok) {
        const menusData = await menusResponse.json();
        setMenus(menusData.menus || []);
      }

      // Fetch role-menu relationships
      const roleMenusResponse = await fetch(`${API_URL}/api/menu/role-access`, {
        credentials: 'include'
      });
      if (roleMenusResponse.ok) {
        const roleMenusData = await roleMenusResponse.json();
        setRoleMenus(roleMenusData.roleMenus || []);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setShowEditForm(true);
  };

  const handleMenuToggle = async (menuId, hasAccess) => {
    if (!selectedRole) return;

    try {
      const method = hasAccess ? 'DELETE' : 'POST';
      const url = hasAccess 
        ? `${API_URL}/api/menu/role-access/${selectedRole.userRoleId}/${menuId}`
        : `${API_URL}/api/menu/role-access`;

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: method === 'POST' ? JSON.stringify({
          userRoleId: selectedRole.userRoleId,
          menuId: menuId,
          flag: 'Y'
        }) : undefined
      });

      if (response.ok) {
        // Refresh data
        await fetchData();
      } else {
        setError('Gagal mengupdate akses menu');
      }
    } catch (err) {
      console.error('Error updating menu access:', err);
      setError('Gagal mengupdate akses menu');
    }
  };

  // New bulk operations
  const handleBulkGrantAccess = async (menuIds) => {
    if (!selectedRole) return;

    try {
      const response = await fetch(`${API_URL}/api/menu/role-access/bulk`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userRoleId: selectedRole.userRoleId,
          menuIds: menuIds,
          action: 'grant'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Bulk grant result:', result);
        await fetchData();
      } else {
        setError('Gagal melakukan bulk grant access');
      }
    } catch (err) {
      console.error('Error bulk granting access:', err);
      setError('Gagal melakukan bulk grant access');
    }
  };

  const handleBulkRevokeAccess = async (menuIds) => {
    if (!selectedRole) return;

    try {
      const response = await fetch(`${API_URL}/api/menu/role-access/bulk`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userRoleId: selectedRole.userRoleId,
          menuIds: menuIds,
          action: 'revoke'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Bulk revoke result:', result);
        await fetchData();
      } else {
        setError('Gagal melakukan bulk revoke access');
      }
    } catch (err) {
      console.error('Error bulk revoking access:', err);
      setError('Gagal melakukan bulk revoke access');
    }
  };

  const handleSelectAllMenus = () => {
    if (!selectedRole) return;
    
    const allMenuIds = menus.map(menu => menu.menuId);
    const currentAccess = roleMenus
      .filter(rm => rm.userRoleId === selectedRole.userRoleId && rm.flag === 'Y')
      .map(rm => rm.menuId);
    
    const missingAccess = allMenuIds.filter(menuId => !currentAccess.includes(menuId));
    
    if (missingAccess.length > 0) {
      handleBulkGrantAccess(missingAccess);
    }
  };

  const handleRevokeAllMenus = () => {
    if (!selectedRole) return;
    
    const currentAccess = roleMenus
      .filter(rm => rm.userRoleId === selectedRole.userRoleId && rm.flag === 'Y')
      .map(rm => rm.menuId);
    
    if (currentAccess.length > 0) {
      handleBulkRevokeAccess(currentAccess);
    }
  };

  const hasMenuAccess = (roleId, menuId) => {
    return roleMenus.some(rm => 
      rm.userRoleId === roleId && rm.menuId === menuId && rm.flag === 'Y'
    );
  };

  const getMenuAccessCount = (roleId) => {
    return roleMenus.filter(rm => 
      rm.userRoleId === roleId && rm.flag === 'Y'
    ).length;
  };

  if (loading) {
    return <div className="loading">Loading role access data...</div>;
  }

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
          {roles.map(role => (
            <div key={role.userRoleId} className="role-card">
              <div className="role-header">
                <h4>{role.nama.charAt(0).toUpperCase() + role.nama.slice(1)}</h4>
                <span className="access-count">
                  {getMenuAccessCount(role.userRoleId)} menus
                </span>
              </div>
              <p className="role-description">
                {role.nama === 'admin' && 'Full access to all features'}
                {role.nama === 'host' && 'Access to most features including recording and screen sharing'}
                {role.nama === 'participant' && 'Basic access to files, chat, and materials'}
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
              <h3>Edit Access for {selectedRole.nama.charAt(0).toUpperCase() + selectedRole.nama.slice(1)}</h3>
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
                {menus.map(menu => {
                  const hasAccess = hasMenuAccess(selectedRole.userRoleId, menu.menuId);
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
                            checked={hasAccess}
                            onChange={() => handleMenuToggle(menu.menuId, hasAccess)}
                          />
                          <span className="slider"></span>
                        </label>
                        <span className="access-status">
                          {hasAccess ? 'Access Granted' : 'Access Denied'}
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
                {roles.map(role => (
                  <th key={role.userRoleId}>
                    {role.nama.charAt(0).toUpperCase() + role.nama.slice(1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {menus.map(menu => (
                <tr key={menu.menuId}>
                  <td className="menu-name">
                    <strong>{menu.displayLabel}</strong>
                    <br />
                    <small>{menu.slug}</small>
                  </td>
                  {roles.map(role => (
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
