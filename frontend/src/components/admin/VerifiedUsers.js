import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import './VerifiedUsers.css';
import { formatLocalDate, formatTableDate, formatTableDateTime } from '../../utils/dateUtils';

const VerifiedUsers = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const [filters, setFilters] = useState({
    search: queryParams.get('search') || '',
    role: queryParams.get('role') || '',
    status: queryParams.get('status') || '',
    page: parseInt(queryParams.get('page')) || 1
  });

  const [users, setUsers] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [pagination, setPagination] = useState({
    page: filters.page,
    pages: 1,
    total: 0
  });
  
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchVerifiedUsers();
    fetchPendingCount();
  }, [filters.page, filters.search, filters.role, filters.status]);

  const fetchVerifiedUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: filters.page,
        ...(filters.search && { search: filters.search }),
        ...(filters.role && { role: filters.role }),
        ...(filters.status && { status: filters.status })
      });
      
      // UPDATED: Changed to /auth/admin/verified-users
      const response = await api.get(`/auth/admin/verified-users?${params}`);
      
      setUsers(response.data.users || []);
      setPagination({
        page: response.data.page || filters.page,
        pages: response.data.pages || 1,
        total: response.data.total || 0
      });
      setError('');
    } catch (err) {
      setError('Failed to load verified users. Please refresh the page.');
      console.error('Error fetching verified users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCount = async () => {
    try {
      // UPDATED: Changed to /auth/admin/pending-count
      const response = await api.get('/auth/admin/pending-count');
      setPendingCount(response.data.count || 0);
    } catch (err) {
      console.error('Error fetching pending count:', err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: 1
    }));
  };

  const applyFilters = (e) => {
    e.preventDefault();
    const params = new URLSearchParams({
      ...(filters.search && { search: filters.search }),
      ...(filters.role && { role: filters.role }),
      ...(filters.status && { status: filters.status }),
      page: 1
    });
    navigate(`/auth/admin/verified-users?${params}`);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      role: '',
      status: '',
      page: 1
    });
    navigate('/auth/admin/verified-users');
  };

  // Activate/Deactivate user function
  const toggleUserStatus = async (userId, userName, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    const confirmMessage = `Are you sure you want to ${action} ${userName}?\n\n${currentStatus ? 'Deactivating will prevent this user from logging in and accessing the system.' : 'Activating will restore full access to this user.'}`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setActionLoading(true);
      // UPDATED: Changed to /auth/admin/users/${userId}/toggle-status
      const response = await api.post(`/auth/admin/users/${userId}/toggle-status`);
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, is_active: !currentStatus }
          : user
      ));
      
      setSuccess(`${userName} has been ${action}d successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errorMessage = err.response?.data?.message || `Failed to ${action} user. Please try again.`;
      setError(errorMessage);
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk action functions
  const bulkActivateUsers = async () => {
    const inactiveUsers = users.filter(user => !user.is_active);
    if (inactiveUsers.length === 0) {
      setError('No inactive users to activate');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    const userNames = inactiveUsers.map(u => u.full_name).join(', ');
    if (!window.confirm(`Are you sure you want to activate the following users?\n\n${userNames}`)) {
      return;
    }
    
    try {
      setActionLoading(true);
      // UPDATED: Changed to /auth/admin/users/bulk-activate
      await api.post('/auth/admin/users/bulk-activate', {
        user_ids: inactiveUsers.map(u => u.id)
      });
      
      setUsers(users.map(user => ({
        ...user,
        is_active: true
      })));
      
      setSuccess(`${inactiveUsers.length} user(s) activated successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to activate users. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const openRoleModal = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
  };

  const closeRoleModal = () => {
    setShowRoleModal(false);
    setSelectedUser(null);
    setNewRole('');
  };

  const handleRoleChange = async (e) => {
    e.preventDefault();
    
    if (!newRole) {
      setError('Please select a role');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setActionLoading(true);
      // UPDATED: Changed to /auth/admin/users/${selectedUser.id}/change-role
      await api.post(`/auth/admin/users/${selectedUser.id}/change-role`, {
        role: newRole
      });
      
      setUsers(users.map(user => 
        user.id === selectedUser.id 
          ? { ...user, role: newRole }
          : user
      ));
      
      setSuccess(`Role for ${selectedUser.full_name} changed to ${newRole} successfully!`);
      closeRoleModal();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change role. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const changePage = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      const params = new URLSearchParams({
        ...(filters.search && { search: filters.search }),
        ...(filters.role && { role: filters.role }),
        ...(filters.status && { status: filters.status }),
        page: newPage
      });
      navigate(`/auth/admin/verified-users?${params}`);
      setFilters(prev => ({ ...prev, page: newPage }));
    }
  };

  const getUserInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const getRoleBadgeStyle = (role) => {
    switch(role?.toLowerCase()) {
      case 'admin':
        return { background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' };
      case 'supervisor':
        return { background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' };
      case 'auditor':
        return { background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' };
      default:
        return { background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' };
    }
  };

  // Format date with local timezone (Kenya)
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return formatLocalDate(dateString, true);
  };

  // Calculate stats
  const activeCount = users.filter(u => u.is_active).length;
  const inactiveCount = users.filter(u => !u.is_active).length;

  if (loading && users.length === 0) {
    return (
      <div className="verified-users-loading">
        <div className="loading-spinner"></div>
        <p>Loading verified users...</p>
      </div>
    );
  }

  return (
    <div className="verified-users">
      <div className="page-header">
        <div>
          <h1>
            <i className="fas fa-users"></i>
            Verified Users
          </h1>
          <p>Manage active system users and their permissions</p>
        </div>
        <div className="header-actions">
          <Link to="/admin/pending-users" className="btn-outline">
            <i className="fas fa-clock"></i> 
            Pending ({pendingCount})
          </Link>
          <Link to="/admin/dashboard" className="btn-outline">
            <i className="fas fa-arrow-left"></i> Back
          </Link>
        </div>
      </div>

      {success && (
        <div className="alert alert-success">
          <i className="fas fa-check-circle"></i>
          {success}
        </div>
      )}
      
      {error && (
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="stat-info">
            <h3>{pagination.total}</h3>
            <p>Total Users</p>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="stat-info">
            <h3>{activeCount}</h3>
            <p>Active Users</p>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">
            <i className="fas fa-ban"></i>
          </div>
          <div className="stat-info">
            <h3>{inactiveCount}</h3>
            <p>Inactive Users</p>
          </div>
        </div>
      </div>

      <div className="filters-card">
        <form onSubmit={applyFilters}>
          <div className="filters-grid">
            <div className="filter-group">
              <label htmlFor="search">Search Users</label>
              <input
                type="text"
                id="search"
                name="search"
                className="form-control"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search by name, email, or license number..."
              />
            </div>
            
            <div className="filter-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                className="form-control"
                value={filters.role}
                onChange={handleFilterChange}
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="clinician">Clinician</option>
                <option value="supervisor">Supervisor</option>
                <option value="auditor">Auditor</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                className="form-control"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            <div className="filter-actions">
              <button type="submit" className="btn-primary">
                <i className="fas fa-search"></i> Filter
              </button>
              {(filters.search || filters.role || filters.status) && (
                <button type="button" className="btn-outline" onClick={clearFilters}>
                  <i className="fas fa-times"></i> Clear
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="users-card">
        {users.length > 0 ? (
          <>
            <div className="card-header">
              <h3>
                <i className="fas fa-users"></i>
                User List
              </h3>
              {inactiveCount > 0 && (
                <button 
                  className="btn-outline-sm" 
                  onClick={bulkActivateUsers}
                  disabled={actionLoading}
                >
                  <i className="fas fa-check-double"></i>
                  Bulk Activate ({inactiveCount})
                </button>
              )}
            </div>
            
            <div className="table-responsive">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Contact</th>
                    <th>Role</th>
                    <th>Verified By</th>
                    <th>Verified At</th>
                    <th>Status</th>
                    <th>Actions</th>
                   </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className={!user.is_active ? 'inactive-row' : ''}>
                      <td>
                        <div className="user-info">
                          <div className="user-avatar" style={{ background: user.is_active ? 'linear-gradient(135deg, #2563eb, #8b5cf6)' : '#94a3b8' }}>
                            {getUserInitials(user.full_name)}
                          </div>
                          <div>
                            <strong>{user.full_name}</strong>
                            <div className="user-license">{user.license_number}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{user.email}</div>
                        <small className="text-muted">{user.institution || 'N/A'}</small>
                      </td>
                      <td>
                        <span className="role-badge" style={getRoleBadgeStyle(user.role)}>
                          {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'User'}
                        </span>
                      </td>
                      <td>{user.verifier?.full_name || 'System'}</td>
                      <td>{formatDate(user.verified_at)}</td>
                      <td>
                        <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                          <i className={`fas fa-${user.is_active ? 'circle' : 'ban'}`}></i>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {/* View Button with Text */}
                          <Link 
                            to={`/admin/user-details/${user.id}`} 
                            className="btn-icon view-btn"
                            title="View Details"
                          >
                            <i className="fas fa-eye"></i>
                            <span className="btn-text">View</span>
                          </Link>
                          
                          {/* Activate/Deactivate Button with Text */}
                          <button
                            className={`btn-icon ${user.is_active ? 'danger' : 'success'}`}
                            onClick={() => toggleUserStatus(user.id, user.full_name, user.is_active)}
                            disabled={actionLoading}
                            title={user.is_active ? 'Deactivate User' : 'Activate User'}
                          >
                            {user.is_active ? (
                              <i className="fas fa-ban"></i>
                            ) : (
                              <i className="fas fa-check"></i>
                            )}
                            <span className="btn-text">
                              {user.is_active ? 'Deactivate' : 'Activate'}
                            </span>
                          </button>
                          
                          {/* Change Role Button with Text */}
                          {user.role !== 'admin' && (
                            <button
                              className="btn-icon role-btn"
                              onClick={() => openRoleModal(user)}
                              disabled={actionLoading}
                              title="Change Role"
                            >
                              <i className="fas fa-user-tag"></i>
                              <span className="btn-text">Role</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {pagination.pages > 1 && (
              <div className="pagination">
                <button
                  className="page-link"
                  onClick={() => changePage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                
                {[...Array(pagination.pages).keys()].map(num => {
                  const pageNum = num + 1;
                  const isActive = pageNum === pagination.page;
                  
                  if (
                    pageNum === 1 ||
                    pageNum === pagination.pages ||
                    (pageNum >= pagination.page - 2 && pageNum <= pagination.page + 2)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        className={`page-link ${isActive ? 'active' : ''}`}
                        onClick={() => changePage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  
                  if (pageNum === pagination.page - 3 || pageNum === pagination.page + 3) {
                    return <span key={pageNum} className="page-ellipsis">...</span>;
                  }
                  
                  return null;
                })}
                
                <button
                  className="page-link"
                  onClick={() => changePage(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <i className="fas fa-users empty-icon"></i>
            <h3>No users found</h3>
            <p>Try adjusting your search filters.</p>
            {(filters.search || filters.role || filters.status) && (
              <button className="btn-outline" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {showRoleModal && selectedUser && (
        <div className="modal-overlay" onClick={closeRoleModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-user-tag"></i>
                Change Role for {selectedUser.full_name}
              </h3>
              <button className="modal-close" onClick={closeRoleModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleRoleChange}>
                <div className="form-group">
                  <label htmlFor="new_role">Select New Role</label>
                  <select
                    id="new_role"
                    className="form-control"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    required
                  >
                    <option value="clinician">Clinician</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="auditor">Auditor</option>
                  </select>
                  <small>Changing role will affect user permissions</small>
                </div>
                
                <div className="modal-actions">
                  <button type="button" className="btn-outline" onClick={closeRoleModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={actionLoading}>
                    {actionLoading ? 'Changing...' : 'Change Role'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifiedUsers;