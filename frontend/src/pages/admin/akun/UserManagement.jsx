import React, { useState, useEffect } from 'react';
import './UserManagement.css';
import { API_URL } from '../../../config';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    userRoleId: ''
  });

  const [roles, setRoles] = useState([
    { userRoleId: 1, nama: 'participant' },
    { userRoleId: 2, nama: 'host' },
    { userRoleId: 3, nama: 'admin' }
  ]);

  useEffect(() => {
    checkAuthAndFetchUsers();
  }, []);

  const checkAuthAndFetchUsers = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated from localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        if (user && user.id) {
          setIsAuthenticated(true);
          
          // Optionally verify session with server
          try {
            const sessionResponse = await fetch(`${API_URL}/api/auth/me`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            
            if (sessionResponse.ok) {
              // Session is valid, fetch users
              await fetchUsers();
            } else if (sessionResponse.status === 401) {
              // Session expired, clear localStorage and show error
              localStorage.removeItem('user');
              setIsAuthenticated(false);
              setError('Sesi Anda telah berakhir. Silakan login ulang.');
            } else {
              // Other error, but still try to fetch users
              await fetchUsers();
            }
          } catch (sessionErr) {
            // If session check fails, still try to fetch users
            console.warn('Session check failed, proceeding with user fetch:', sessionErr);
            await fetchUsers();
          }
          
          return;
        }
      }
      
      // If not authenticated, show error
      setIsAuthenticated(false);
      setError('Anda harus login terlebih dahulu. Silakan login untuk mengakses halaman ini.');
    } catch (err) {
      console.error('Error checking auth:', err);
      setIsAuthenticated(false);
      setError('Gagal memeriksa status autentikasi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUsers(data.users || []);
          setError('');
        } else {
          setError(data.message || 'Gagal memuat data users');
        }
      } else if (response.status === 401) {
        setIsAuthenticated(false);
        setError('Sesi Anda telah berakhir. Silakan login ulang.');
      } else {
        setError('Gagal memuat data users dari server');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Gagal memuat data users');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateUser(editingUser.id, formData);
      } else {
        await addUser(formData);
      }
      setShowAddForm(false);
      setEditingUser(null);
      setFormData({ username: '', password: '', userRoleId: '' });
      fetchUsers();
    } catch (err) {
      console.error('Error saving user:', err);
      setError('Gagal menyimpan user');
    }
  };

  const addUser = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: userData.username,
          password: userData.password,
          userRoleId: userData.userRoleId
        })
      });

      const data = await response.json();
      if (data.success) {
        setUsers(prev => [...prev, data.user]);
        setError('');
      } else {
        setError(data.message || 'Gagal membuat user');
        throw new Error(data.message);
      }
    } catch (err) {
      console.error('Error creating user:', err);
      setError('Gagal membuat user');
      throw err;
    }
  };

  const updateUser = async (userId, userData) => {
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: userData.username,
          password: userData.password || undefined,
          userRoleId: userData.userRoleId
        })
      });

      const data = await response.json();
      if (data.success) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? data.user : user
        ));
        setError('');
      } else {
        setError(data.message || 'Gagal mengupdate user');
        throw new Error(data.message);
      }
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Gagal mengupdate user');
      throw err;
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus user ini?')) {
      try {
        const response = await fetch(`${API_URL}/api/users/${userId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const data = await response.json();
        if (data.success) {
          setUsers(prev => prev.filter(user => user.id !== userId));
          setError('');
        } else {
          setError(data.message || 'Gagal menghapus user');
        }
      } catch (err) {
        console.error('Error deleting user:', err);
        setError('Gagal menghapus user');
      }
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      userRoleId: roles.find(r => r.nama === user.role)?.userRoleId || '1'
    });
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingUser(null);
    setFormData({ username: '', password: '', userRoleId: '' });
  };

  // Show login message if not authenticated
  if (!isAuthenticated && !loading) {
    return (
      <div className="user-management">
        <div className="section-header">
          <h2>User Management</h2>
        </div>
        <div className="error-message">
          {error}
          <br />
          <button 
            className="btn-primary" 
            onClick={() => window.location.href = '/login'}
            style={{ marginTop: '10px' }}
          >
            Login Sekarang
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="user-management">
      <div className="section-header">
        <h2>User Management</h2>
        <button 
          className="btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          + Add New User
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Add/Edit User Form */}
      {showAddForm && (
        <div className="form-overlay">
          <div className="form-modal">
            <h3>{editingUser ? 'Edit User' : 'Add New User'}</h3>
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
                  placeholder={editingUser ? 'Leave blank to keep current' : ''}
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
                  {roles.map(role => (
                    <option key={role.userRoleId} value={role.userRoleId}>
                      {role.nama.charAt(0).toUpperCase() + role.nama.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingUser ? 'Update User' : 'Add User'}
                </button>
                <button type="button" className="btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                
                <td>
                  <span className={`role-badge role-${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`status-badge status-${user.status}`}>
                    {user.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-edit"
                      onClick={() => handleEdit(user)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => deleteUser(user.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Statistics */}
      <div className="user-stats">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-number">{users.length}</p>
        </div>
        <div className="stat-card">
          <h3>Admins</h3>
          <p className="stat-number">{users.filter(u => u.role === 'admin').length}</p>
        </div>
        <div className="stat-card">
          <h3>Hosts</h3>
          <p className="stat-number">{users.filter(u => u.role === 'host').length}</p>
        </div>
        <div className="stat-card">
          <h3>Participants</h3>
          <p className="stat-number">{users.filter(u => u.role === 'participant').length}</p>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
