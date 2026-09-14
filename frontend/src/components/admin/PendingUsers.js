import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './PendingUsers.css';
import { formatLocalDate, formatTableDate, formatTableDateTime } from '../../utils/dateUtils';

const PendingUsers = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('📡 Fetching pending users...');
      
      // UPDATED: Changed to /auth/admin/pending-users
      const response = await api.get('/auth/admin/pending-users');
      console.log(' Pending users response:', response.data);
      
      if (Array.isArray(response.data)) {
        setPendingUsers(response.data);
      } else {
        setPendingUsers([]);
        console.warn('Unexpected response format:', response.data);
      }
      
    } catch (err) {
      console.error(' Error fetching pending users:', err);
      setError('Failed to load pending users. Please try again.');
      setPendingUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId) => {
    setProcessingId(userId);
    setSuccessMessage('');
    setError('');
    
    try {
      // UPDATED: Changed to /auth/admin/verify-user/${userId}
      const response = await api.post(`/auth/admin/verify-user/${userId}`);
      console.log(' Verify response:', response.data);
      
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      
      // Check if the verified user is the currently logged-in user
      const currentUserStr = localStorage.getItem('user');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        if (currentUser.id === userId) {
          // Update localStorage with fresh user data from response
          const updatedUser = {
            ...currentUser,
            is_verified: true,
            is_active: true,
            role: response.data.user?.role || 'clinician'
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setSuccessMessage('Your account has been verified! Redirecting to dashboard...');
          
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 2000);
        } else {
          setSuccessMessage('User verified successfully!');
          setTimeout(() => setSuccessMessage(''), 3000);
        }
      } else {
        setSuccessMessage('User verified successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
      
    } catch (err) {
      console.error(' Error verifying user:', err);
      setError(err.response?.data?.message || 'Failed to verify user. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId) => {
    setProcessingId(userId);
    setSuccessMessage('');
    setError('');
    
    try {
      // UPDATED: Changed to /auth/admin/reject-user/${userId}
      const response = await api.post(`/auth/admin/reject-user/${userId}`);
      console.log(' Reject response:', response.data);
      
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      setSuccessMessage('User rejected successfully!');
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(' Error rejecting user:', err);
      setError('Failed to reject user. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  // Format date with local timezone (Kenya)
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return formatLocalDate(dateString, true);
  };

  const getUserInitials = (user) => {
    if (user.full_name) {
      return user.full_name.charAt(0).toUpperCase();
    }
    return user.email.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="pending-users-loading">
        <div className="loading-spinner"></div>
        <p>Loading pending users...</p>
      </div>
    );
  }

  return (
    <div className="pending-users">
      {/* Header Section */}
      <div className="page-header">
        <h1>
          <i className="fas fa-user-clock"></i>
          Pending User Verifications
        </h1>
        <p className="page-description">Review and verify new user accounts</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="filters-bar">
        <div className="search-box">
          <i className="fas fa-search search-icon"></i>
          <input 
            type="text" 
            placeholder="Search by name, email, or license" 
            className="search-input"
          />
        </div>
        
        <div className="filter-actions">
          <select className="filter-select">
            <option>All Roles</option>
            <option>Clinician</option>
            <option>Admin</option>
          </select>
          
          <select className="filter-select">
            <option>All</option>
            <option>Pending</option>
            <option>Verified</option>
          </select>
          
          <button className="btn-filter">
            <i className="fas fa-filter"></i>
            Filter
          </button>
        </div>
      </div>

      {error && (
        <div className="error-alert">
          <i className="fas fa-exclamation-circle"></i>
          {error}
          <button onClick={fetchPendingUsers} className="retry-btn">
            <i className="fas fa-sync-alt"></i> Retry
          </button>
        </div>
      )}

      {successMessage && (
        <div className="success-alert">
          <i className="fas fa-check-circle"></i>
          {successMessage}
        </div>
      )}

      {/* Users Grid */}
      {pendingUsers.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-user-clock"></i>
          <h3>No Pending Verifications</h3>
          <p>All user accounts have been verified.</p>
          <button onClick={fetchPendingUsers} className="btn-refresh">
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      ) : (
        <div className="users-grid-compact">
          {pendingUsers.map(user => (
            <div key={user.id} className="user-card-compact pending">
              {/* Row 1: User Header - All in one line */}
              <div className="row header-row">
                <div className="user-avatar-compact">
                  {getUserInitials(user)}
                </div>
                <span className="user-name">{user.full_name || 'Unknown'}</span>
                <span className="user-email">{user.email}</span>
                <span className="status-badge pending-badge">Pending</span>
              </div>

              {/* Row 2: Details - All in one line */}
              <div className="row details-row">
                <div className="detail-item">
                  <span className="detail-label">REGISTERED</span>
                  <span className="detail-value">{formatDate(user.created_at)}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">REQUESTED ROLE</span>
                  <span className="detail-value">{user.role}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">VERIFIED BY</span>
                  <span className="detail-value">—</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">VERIFIED AT</span>
                  <span className="detail-value">—</span>
                </div>
              </div>

              {/* Row 3: Verification Status - All in one line */}
              <div className="row verification-row">
                <span className="status-label">Pending User Verification Status:</span>
                <div className="status-icons">
                  <span className="status-icon-item">
                    <i className="fas fa-check-circle"></i> Admin
                  </span>
                  <span className="status-icon-item">
                    <i className="fas fa-check-circle"></i> MedPredict
                  </span>
                </div>
              </div>

              {/* Row 4: Action Buttons - All in one line */}
              <div className="row actions-row">
                <button 
                  className="btn-action verify"
                  onClick={() => handleVerify(user.id)}
                  disabled={processingId === user.id}
                >
                  {processingId === user.id ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <>Verify</>
                  )}
                </button>
                
                <button 
                  className="btn-action reject"
                  onClick={() => handleReject(user.id)}
                  disabled={processingId === user.id}
                >
                  Reject
                </button>

                <Link 
                  to={`/admin/user-details/${user.id}`} 
                  className="btn-action view"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingUsers;