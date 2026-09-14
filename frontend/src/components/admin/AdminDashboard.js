import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    pending_count: 0,
    active_count: 0,
    total_users: 0,
    audit_count: 0
  });
  
  const [recentAudits, setRecentAudits] = useState([]);
  const [systemStatus, setSystemStatus] = useState({
    database: 'Connected',
    db_type: 'SQLite',
    db_location: 'instance/medipredict.db',
    ml_status: 'Loaded',
    ml_model: 'Drug Recommendation',
    ml_version: '1.0.0'
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [statsRes, auditsRes, systemRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/recent-audits?limit=5'),
        api.get('/admin/system-status')
      ]);
      
      setStats(statsRes.data);
      setRecentAudits(auditsRes.data || []);
      setSystemStatus(systemRes.data);
      setError('');
    } catch (err) {
      setError('Failed to load dashboard data. Please refresh the page.');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeClass = (action) => {
    if (!action) return 'info';
    
    const actionUpper = action.toUpperCase();
    if (actionUpper.includes('SUCCESS') || actionUpper.includes('VERIFIED')) {
      return 'success';
    } else if (actionUpper.includes('FAILED') || actionUpper.includes('LOCKED') || actionUpper.includes('ERROR')) {
      return 'danger';
    } else if (actionUpper.includes('PENDING') || actionUpper.includes('WAITING')) {
      return 'warning';
    }
    return 'info';
  };

  if (loading && !stats.total_users) {
    return (
      <div className="admin-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* White container for header and stats */}
      <div className="admin-top-section">
        <div className="admin-header">
          <h1>
            <i className="fas fa-shield-alt"></i>
            Admin Dashboard
          </h1>
          <p>Manage users, monitor system activity, and configure settings.</p>
        </div>

        {error && (
          <div className="error-alert">
            <i className="fas fa-exclamation-circle"></i>
            {error}
            <button onClick={fetchDashboardData} className="retry-btn">
              <i className="fas fa-sync-alt"></i> Retry
            </button>
          </div>
        )}

        {/* Stats Grid - WITHOUT ICONS */}
        <div className="stats-grid">
          <div className="stat-card pending">
            <div className="stat-content">
              <div className="stat-value">{stats.pending_count}</div>
              <div className="stat-label">PENDING VERIFICATIONS</div>
              {stats.pending_count > 0 && (
                <div className="stat-trend">
                  <i className="fas fa-arrow-up"></i> Requires attention
                </div>
              )}
            </div>
          </div>
          
          <div className="stat-card active">
            <div className="stat-content">
              <div className="stat-value">{stats.active_count}</div>
              <div className="stat-label">ACTIVE USERS</div>
            </div>
          </div>
          
          <div className="stat-card total">
            <div className="stat-content">
              <div className="stat-value">{stats.total_users}</div>
              <div className="stat-label">TOTAL USERS</div>
            </div>
          </div>
          
          <div className="stat-card audit">
            <div className="stat-content">
              <div className="stat-value">{stats.audit_count}</div>
              <div className="stat-label">AUDIT LOGS</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Section - WITHOUT ICONS */}
      <div className="quick-actions-section">
        <div className="section-header">
          <i className="fas fa-bolt"></i>
          <h2>Quick Actions</h2>
        </div>
        
        <div className="action-grid">
          <Link to="/admin/pending-users" className="action-card pending-action">
            <div className="action-title">Pending Verifications</div>
            <div className="action-desc">Review and verify new user accounts</div>
          </Link>
          
          <Link to="/admin/verified-users" className="action-card active-action">
            <div className="action-title">Manage Users</div>
            <div className="action-desc">Edit roles, activate/deactivate users</div>
          </Link>
          
          <Link to="/admin/audit-logs" className="action-card audit-action">
            <div className="action-title">Audit Logs</div>
            <div className="action-desc">View system activity and security events</div>
          </Link>
          
          <Link to="/admin/contact-messages" className="action-card contact-action">
            <div className="action-title">Contact Messages</div>
            <div className="action-desc">View messages from users</div>
          </Link>
          
          <Link to="/admin/settings" className="action-card settings-action">
            <div className="action-title">Settings</div>
            <div className="action-desc">Configure system preferences</div>
          </Link>
        </div>
      </div>

      {/* System Status Section - Keep icons here as they're useful for status */}
      <div className="system-status-section">
        <div className="section-header">
          <i className="fas fa-server"></i>
          <h2>System Status</h2>
        </div>
        
        <div className="status-grid">
          <div className="status-card">
            <h3>
              <i className="fas fa-database"></i>
              Database Status
            </h3>
            <div className="status-item">
              <span className="status-label">Connection</span>
              <span className="status-badge healthy">{systemStatus.database || 'Connected'}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Type</span>
              <span className="status-value">{systemStatus.db_type || 'SQLite'}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Location</span>
              <span className="status-value">{systemStatus.db_location || 'instance/medipredict.db'}</span>
            </div>
          </div>
          
          <div className="status-card">
            <h3>
              <i className="fas fa-brain"></i>
              ML Model Status
            </h3>
            <div className="status-item">
              <span className="status-label">Status</span>
              <span className="status-badge healthy">{systemStatus.ml_status || 'Loaded'}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Model</span>
              <span className="status-value">{systemStatus.ml_model || 'Drug Recommendation'}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Version</span>
              <span className="status-value">{systemStatus.ml_version || '1.0.0'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section - Keep icons here as they're useful for activity */}
      <div className="recent-activity-section">
        <div className="activity-header">
          <h2>
            <i className="fas fa-history"></i>
            Recent Activity
          </h2>
          <Link to="/admin/audit-logs" className="view-all-link">
            View All <i className="fas fa-arrow-right"></i>
          </Link>
        </div>
        
        {recentAudits.length > 0 ? (
          <div className="activity-table-wrapper">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>IP Address</th>
                  <th>Status</th>
                 </tr>
              </thead>
              <tbody>
                {recentAudits.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>
                      <div className="user-cell">
                        {log.user ? (
                          <>
                            <div className="user-avatar-small">
                              {log.user.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span>{log.user.full_name || 'Unknown'}</span>
                          </>
                        ) : (
                          <span>System</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`action-badge ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.ip_address || 'N/A'}</td>
                    <td>
                      {log.success ? (
                        <span style={{ color: '#10b981' }}>
                          <i className="fas fa-check-circle"></i> Success
                        </span>
                      ) : (
                        <span style={{ color: '#ef4444' }}>
                          <i className="fas fa-times-circle"></i> Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <i className="fas fa-history"></i>
            <p>No recent activity to display</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;