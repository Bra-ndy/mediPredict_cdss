import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import './AuditLogs.css';

const AuditLogs = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const [filters, setFilters] = useState({
    user: queryParams.get('user') || '',
    action: queryParams.get('action') || '',
    date_from: queryParams.get('date_from') || '',
    date_to: queryParams.get('date_to') || '',
    status: queryParams.get('status') || '',
    page: parseInt(queryParams.get('page')) || 1
  });

  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [pagination, setPagination] = useState({
    page: filters.page,
    pages: 1,
    total: 0
  });
  
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAuditLogs();
  }, [filters.page, filters.user, filters.action, filters.date_from, filters.date_to, filters.status]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: filters.page,
        ...(filters.user && { user: filters.user }),
        ...(filters.action && { action: filters.action }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
        ...(filters.status && { status: filters.status })
      });
      
      const response = await api.get(`/admin/audit-logs?${params}`);
      
      setLogs(response.data.logs || []);
      setTotalLogs(response.data.total || 0);
      setPagination({
        page: response.data.page || filters.page,
        pages: response.data.pages || 1,
        total: response.data.total || 0
      });
      setError('');
    } catch (err) {
      setError('Failed to load audit logs. Please refresh the page.');
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
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
      ...(filters.user && { user: filters.user }),
      ...(filters.action && { action: filters.action }),
      ...(filters.date_from && { date_from: filters.date_from }),
      ...(filters.date_to && { date_to: filters.date_to }),
      ...(filters.status && { status: filters.status }),
      page: 1
    });
    navigate(`/admin/audit-logs?${params}`);
  };

  const clearFilters = () => {
    setFilters({
      user: '',
      action: '',
      date_from: '',
      date_to: '',
      status: '',
      page: 1
    });
    navigate('/admin/audit-logs');
  };

  const changePage = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      const params = new URLSearchParams({
        ...(filters.user && { user: filters.user }),
        ...(filters.action && { action: filters.action }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
        ...(filters.status && { status: filters.status }),
        page: newPage
      });
      navigate(`/admin/audit-logs?${params}`);
      setFilters(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleExport = async (format) => {
    try {
      setExporting(true);
      
      const params = new URLSearchParams({
        format,
        ...(filters.user && { user: filters.user }),
        ...(filters.action && { action: filters.action }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
        ...(filters.status && { status: filters.status })
      });
      
      const response = await api.get(`/admin/export-logs?${params}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
    } catch (err) {
      setError('Failed to export logs. Please try again.');
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const showDetails = (details) => {
    setSelectedDetails(details || 'No additional details');
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedDetails('');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionBadgeStyle = (action) => {
    const actionUpper = action?.toUpperCase() || '';
    if (actionUpper.includes('SUCCESS') || actionUpper.includes('VERIFIED')) {
      return { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
    } else if (actionUpper.includes('FAILED') || actionUpper.includes('REJECTED')) {
      return { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' };
    } else if (actionUpper.includes('PENDING')) {
      return { background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' };
    } else if (actionUpper.includes('LOGIN') || actionUpper.includes('LOGOUT')) {
      return { background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' };
    } else {
      return { background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' };
    }
  };

  const actionOptions = [
    { value: '', label: 'All Actions' },
    { value: 'LOGIN_SUCCESS', label: 'Login Success' },
    { value: 'LOGIN_FAILED', label: 'Login Failed' },
    { value: 'LOGOUT', label: 'Logout' },
    { value: 'ACCOUNT_CREATED', label: 'Account Created' },
    { value: 'USER_VERIFIED', label: 'User Verified' },
    { value: 'USER_REJECTED', label: 'User Rejected' },
    { value: 'PASSWORD_RESET', label: 'Password Reset' }
  ];

  if (loading && logs.length === 0) {
    return (
      <div className="audit-logs-loading">
        <div className="loading-spinner"></div>
        <p>Loading audit logs...</p>
      </div>
    );
  }

  return (
    <div className="audit-logs">
      <div className="audit-logs-content" style={{ background: 'white', borderRadius: '16px', padding: '2rem' }}>
        
        {/* Page Header */}
        <div className="page-header">
          <h1>
            <span className="page-header-icon">
              <i className="fas fa-history"></i>
            </span>
            Audit Logs
          </h1>
          <p className="record-count">{logs.length} of {totalLogs} entries</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-circle"></i>
            {error}
            <button onClick={fetchAuditLogs} className="retry-btn">
              <i className="fas fa-sync-alt"></i> Retry
            </button>
          </div>
        )}

        {/* Filters Card */}
        <div className="filters-card">
          <div className="section-header">
            <i className="fas fa-filter"></i>
            <h2>Filter Logs</h2>
          </div>
          
          <form onSubmit={applyFilters}>
            <div className="filters-grid">
              <div className="filter-group">
                <label htmlFor="user">User</label>
                <input
                  type="text"
                  id="user"
                  name="user"
                  className="form-control"
                  value={filters.user}
                  onChange={handleFilterChange}
                  placeholder="User ID or name"
                />
              </div>
              
              <div className="filter-group">
                <label htmlFor="action">Action</label>
                <select
                  id="action"
                  name="action"
                  className="form-control"
                  value={filters.action}
                  onChange={handleFilterChange}
                >
                  {actionOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label htmlFor="date_from">From Date</label>
                <input
                  type="date"
                  id="date_from"
                  name="date_from"
                  className="form-control"
                  value={filters.date_from}
                  onChange={handleFilterChange}
                />
              </div>
              
              <div className="filter-group">
                <label htmlFor="date_to">To Date</label>
                <input
                  type="date"
                  id="date_to"
                  name="date_to"
                  className="form-control"
                  value={filters.date_to}
                  onChange={handleFilterChange}
                />
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
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              
              <div className="filter-actions">
                <button type="submit" className="btn-primary">
                  <i className="fas fa-search"></i> Apply Filters
                </button>
                {(filters.user || filters.action || filters.date_from || filters.date_to || filters.status) && (
                  <button type="button" className="btn-outline" onClick={clearFilters}>
                    <i className="fas fa-times"></i> Clear
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Logs Card */}
        <div className="logs-card">
          <div className="section-header">
            <i className="fas fa-list"></i>
            <h2>System Logs</h2>
          </div>
          
          {logs.length > 0 ? (
            <>
              <div className="table-responsive">
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Resource</th>
                      <th>IP Address</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td>{formatDateTime(log.timestamp)}</td>
                        <td>
                          {log.user ? (
                            <Link to={`/admin/user-details/${log.user.id}`} className="user-link">
                              {log.user.full_name}
                            </Link>
                          ) : (
                            <span className="text-muted">System (User #{log.user_id})</span>
                          )}
                        </td>
                        <td>
                          <span className="action-badge" style={getActionBadgeStyle(log.action)}>
                            {log.action}
                          </span>
                        </td>
                        <td>
                          {log.resource_type ? (
                            <span className="resource-badge">
                              {log.resource_type} #{log.resource_id}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>{log.ip_address || 'N/A'}</td>
                        <td>
                          {log.success ? (
                            <span className="status-success">
                              <i className="fas fa-check-circle"></i> Success
                            </span>
                          ) : (
                            <span className="status-danger">
                              <i className="fas fa-times-circle"></i> Failed
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="action-buttons">
                            {log.details ? (
                              <button
                                className="action-btn details-btn"
                                onClick={() => showDetails(log.details)}
                                title="View Details"
                              >
                                <i className="fas fa-info-circle"></i>
                                <span className="btn-text">Details</span>
                              </button>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="pagination">
                  <button
                    className="page-item"
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
                          className={`page-item ${isActive ? 'active' : ''}`}
                          onClick={() => changePage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    
                    if (pageNum === pagination.page - 3 || pageNum === pagination.page + 3) {
                      return <span key={pageNum} className="page-item disabled">...</span>;
                    }
                    
                    return null;
                  })}
                  
                  <button
                    className="page-item"
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
              <div className="empty-state-icon">
                <i className="fas fa-history"></i>
              </div>
              {filters.user || filters.action || filters.date_from || filters.date_to || filters.status ? (
                <>
                  <h3>No logs found</h3>
                  <p>No results match your filters</p>
                  <button onClick={clearFilters} className="btn-secondary">
                    <i className="fas fa-times"></i> Clear Filters
                  </button>
                </>
              ) : (
                <>
                  <h3>No logs yet</h3>
                  <p>System activity logs will appear here</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Export Card */}
        <div className="export-card">
          <div className="section-header">
            <i className="fas fa-download"></i>
            <h2>Export Logs</h2>
          </div>
          <div className="export-content">
            <p className="export-text">Download audit logs for compliance and record keeping</p>
            <div className="export-buttons">
              <button
                className="btn-outline export-btn"
                onClick={() => handleExport('csv')}
                disabled={exporting}
              >
                <i className="fas fa-file-csv"></i>
                {exporting ? 'Exporting...' : 'Export as CSV'}
              </button>
              <button
                className="btn-outline export-btn"
                onClick={() => handleExport('json')}
                disabled={exporting}
              >
                <i className="fas fa-file-code"></i>
                {exporting ? 'Exporting...' : 'Export as JSON'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="modal" onClick={closeDetailsModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>
              <i className="fas fa-info-circle"></i>
              Log Details
            </h3>
            <div className="details-content">
              {selectedDetails}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-outline" onClick={closeDetailsModal}>
                <i className="fas fa-times"></i> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;