import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import './UserDetails.css';

const UserDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [verifier, setVerifier] = useState(null);
  const [userLogs, setUserLogs] = useState([]);
  
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newRole, setNewRole] = useState('');
  
  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: ''
  });
  const [passwordError, setPasswordError] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      // UPDATED: Changed to /auth/admin/users/${userId}
      const response = await api.get(`/auth/admin/users/${userId}`);
      
      setUser(response.data.user);
      setVerifier(response.data.verifier);
      setUserLogs(response.data.recent_logs || []);
      setNewRole(response.data.user?.role || '');
      setError('');
    } catch (err) {
      setError('Failed to load user details. Please try again.');
      console.error('Error fetching user details:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async () => {
    const action = user.is_active ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${user.full_name}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      // UPDATED: Changed to /auth/admin/users/${userId}/toggle-status
      await api.post(`/auth/admin/users/${userId}/toggle-status`);
      
      setUser(prev => ({ ...prev, is_active: !prev.is_active }));
      setSuccess(`User ${user.full_name} has been ${action}d successfully!`);
      
      await fetchUserData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} user.`);
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (e) => {
    e.preventDefault();
    
    if (!newRole) {
      setError('Please select a role');
      return;
    }

    try {
      setActionLoading(true);
      // UPDATED: Changed to /auth/admin/users/${userId}/change-role
      await api.post(`/auth/admin/users/${userId}/change-role`, { role: newRole });
      
      setUser(prev => ({ ...prev, role: newRole }));
      setSuccess(`Role for ${user.full_name} changed to ${newRole} successfully!`);
      
      closeRoleModal();
      await fetchUserData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change role.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    
    if (passwordError) {
      setPasswordError('');
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (passwordData.new_password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      setActionLoading(true);
      // UPDATED: Changed to /auth/admin/users/${userId}/reset-password
      await api.post(`/auth/admin/users/${userId}/reset-password`, {
        new_password: passwordData.new_password
      });
      
      setSuccess(`Password for ${user.full_name} has been reset successfully!`);
      closePasswordModal();
      
      setPasswordData({ new_password: '', confirm_password: '' });
      
      await fetchUserData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setActionLoading(false);
    }
  };

  const openRoleModal = () => setShowRoleModal(true);
  const closeRoleModal = () => {
    setShowRoleModal(false);
    setNewRole(user?.role || '');
  };

  const openPasswordModal = () => setShowPasswordModal(true);
  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordData({ new_password: '', confirm_password: '' });
    setPasswordError('');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (loading) {
    return (
      <div className="user-details-loading">
        <div className="loading-spinner"></div>
        <p>Loading user details...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-details-error">
        <i className="fas fa-exclamation-circle"></i>
        <h3>User Not Found</h3>
        <p>The requested user could not be found.</p>
        <Link to="/admin/verified-users" className="btn-primary">
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="user-details">
      <div className="page-header">
        <div>
          <h1>
            <i className="fas fa-user-circle"></i>
            User Details
          </h1>
          <p>Viewing information for {user.full_name}</p>
        </div>
        <div>
          <Link to="/admin/verified-users" className="btn-outline">
            <i className="fas fa-arrow-left"></i> Back to Users
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

      <div className="details-grid">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {user.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <h2>{user.full_name}</h2>
            <span className="role-badge" style={getRoleBadgeStyle(user.role)}>
              {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'User'}
            </span>
          </div>
          
          <div className="account-status">
            <h3>Account Status</h3>
            
            <div className="status-item">
              <span>Verified:</span>
              {user.is_verified ? (
                <span className="status-success">
                  <i className="fas fa-check-circle"></i> Yes
                </span>
              ) : (
                <span className="status-danger">
                  <i className="fas fa-times-circle"></i> No
                </span>
              )}
            </div>
            
            <div className="status-item">
              <span>Active:</span>
              {user.is_active ? (
                <span className="status-success">
                  <i className="fas fa-check-circle"></i> Yes
                </span>
              ) : (
                <span className="status-danger">
                  <i className="fas fa-times-circle"></i> No
                </span>
              )}
            </div>
            
            <div className="status-item">
              <span>Locked:</span>
              {user.is_locked ? (
                <span className="status-danger">
                  Yes (until {formatDateTime(user.locked_until)})
                </span>
              ) : (
                <span className="status-success">No</span>
              )}
            </div>
          </div>
          
          <div className="quick-actions">
            <h3>Quick Actions</h3>
            
            <button
              className={`action-button ${user.is_active ? 'danger' : 'success'}`}
              onClick={toggleUserStatus}
              disabled={actionLoading}
            >
              {user.is_active ? (
                <><i className="fas fa-ban"></i> Deactivate Account</>
              ) : (
                <><i className="fas fa-check"></i> Activate Account</>
              )}
            </button>
            
            {user.role !== 'admin' && (
              <button
                className="action-button outline"
                onClick={openRoleModal}
                disabled={actionLoading}
              >
                <i className="fas fa-user-tag"></i> Change Role
              </button>
            )}
            
            <button
              className="action-button outline"
              onClick={openPasswordModal}
              disabled={actionLoading}
            >
              <i className="fas fa-key"></i> Reset Password
            </button>
          </div>
        </div>

        <div className="details-section">
          <div className="info-card">
            <h3 className="section-title">
              <i className="fas fa-id-card"></i>
              Personal Information
            </h3>
            
            <div className="info-grid">
              <div>
                <p className="info-label">Full Name</p>
                <p className="info-value">{user.full_name}</p>
              </div>
              <div>
                <p className="info-label">Email Address</p>
                <p className="info-value">{user.email}</p>
              </div>
              <div>
                <p className="info-label">License Number</p>
                <p className="info-value monospace">{user.license_number || 'N/A'}</p>
              </div>
              <div>
                <p className="info-label">Professional ID</p>
                <p className="info-value">{user.professional_id || 'N/A'}</p>
              </div>
              <div>
                <p className="info-label">Institution</p>
                <p className="info-value">{user.institution || 'N/A'}</p>
              </div>
              <div>
                <p className="info-label">Specialization</p>
                <p className="info-value">{user.specialization || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div className="info-card">
            <h3 className="section-title">
              <i className="fas fa-history"></i>
              Account Information
            </h3>
            
            <div className="info-grid">
              <div>
                <p className="info-label">Created At</p>
                <p className="info-value">{formatDateTime(user.created_at)}</p>
              </div>
              <div>
                <p className="info-label">Last Login</p>
                <p className="info-value">{formatDateTime(user.last_login_at)}</p>
              </div>
              <div>
                <p className="info-label">Last Login IP</p>
                <p className="info-value">{user.last_login_ip || 'N/A'}</p>
              </div>
              <div>
                <p className="info-label">Failed Login Attempts</p>
                <p className="info-value">{user.failed_login_attempts || 0} / 5</p>
              </div>
            </div>
            
            <hr className="divider" />
            
            <div className="info-grid">
              <div>
                <p className="info-label">Verified By</p>
                <p className="info-value">{verifier?.full_name || 'System'}</p>
              </div>
              <div>
                <p className="info-label">Verified At</p>
                <p className="info-value">{formatDateTime(user.verified_at) || 'Not verified'}</p>
              </div>
            </div>
          </div>
          
          <div className="info-card">
            <h3 className="section-title">
              <i className="fas fa-history"></i>
              Recent Activity (Last 20 actions)
            </h3>
            
            {userLogs.length > 0 ? (
              <div className="table-responsive">
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>IP Address</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userLogs.map((log, index) => (
                      <tr key={index}>
                        <td>{formatDateTime(log.timestamp)}</td>
                        <td>
                          <span className="action-badge">
                            {log.action}
                          </span>
                        </td>
                        <td>{log.ip_address || 'N/A'}</td>
                        <td>
                          {log.success ? (
                            <span className="status-success">Success</span>
                          ) : (
                            <span className="status-danger">Failed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-text">No activity logs found</p>
            )}
          </div>
        </div>
      </div>

      {showRoleModal && (
        <div className="modal" onClick={closeRoleModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Change User Role</h3>
            
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
      )}

      {showPasswordModal && (
        <div className="modal" onClick={closePasswordModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Reset User Password</h3>
            
            <form onSubmit={handlePasswordReset}>
              <div className="form-group">
                <label htmlFor="new_password">New Password</label>
                <input
                  type="password"
                  id="new_password"
                  name="new_password"
                  className="form-control"
                  value={passwordData.new_password}
                  onChange={handlePasswordChange}
                  required
                  placeholder="Enter new password"
                  minLength="6"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirm_password">Confirm Password</label>
                <input
                  type="password"
                  id="confirm_password"
                  name="confirm_password"
                  className="form-control"
                  value={passwordData.confirm_password}
                  onChange={handlePasswordChange}
                  required
                  placeholder="Confirm new password"
                />
              </div>
              
              {passwordError && (
                <div className="error-message">{passwordError}</div>
              )}
              
              <div className="warning-box">
                <i className="fas fa-exclamation-triangle"></i>
                <p>The user will be logged out immediately and will need to use the new password.</p>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={closePasswordModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-danger" disabled={actionLoading}>
                  {actionLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetails;