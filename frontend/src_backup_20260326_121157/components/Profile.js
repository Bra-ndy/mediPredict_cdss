// components/Profile.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();

  // State for user data
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    patients_count: 0,
    assessments_count: 0
  });

  // Fetch user profile data on component mount
  useEffect(() => {
    fetchProfileData();
    fetchUserStats();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      // Get current user from localStorage as fallback
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        navigate('/login');
        return;
      }

      const userData = JSON.parse(userStr);
      
      // Try to get fresh user data from API
      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
      } catch (apiErr) {
        console.warn('Could not fetch fresh user data, using cached data');
        setUser(userData);
      }
      
      setError('');
    } catch (err) {
      setError('Failed to load profile data. Please refresh the page.');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await api.get('/clinical/user-stats');
      setStats({
        patients_count: response.data.patients_count || 0,
        assessments_count: response.data.assessments_count || 0
      });
    } catch (err) {
      console.error('Error fetching user stats:', err);
      // Keep default zeros
    }
  };

  // Handle edit profile (placeholder)
  const handleEditProfile = () => {
    alert('Profile editing coming soon!');
  };

  // Format date
  const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (includeTime) {
        return date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).replace(/\//g, '/');
      }
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '/');
    } catch (e) {
      return 'N/A';
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.full_name) return 'U';
    return user.full_name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-error">
        <i className="fas fa-exclamation-circle"></i>
        <h3>Not Authenticated</h3>
        <p>Please log in to view your profile.</p>
        <button onClick={() => navigate('/login')} className="btn-primary">
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="page-header">
        <h1>
          <i className="fas fa-user-circle"></i>
          My Profile
        </h1>
      </div>

      {error && (
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle"></i>
          {error}
          <button onClick={fetchProfileData} className="retry-btn">
            <i className="fas fa-sync-alt"></i> Retry
          </button>
        </div>
      )}

      <div className="profile-grid">
        {/* Profile Summary Card */}
        <div className="profile-summary-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {getUserInitials()}
            </div>
            <h2>{user.full_name}</h2>
            <p className="profile-role">{user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'User'}</p>
          </div>

          <div className="profile-details">
            <div className="detail-item">
              <i className="fas fa-envelope"></i>
              <span>{user.email}</span>
            </div>
            <div className="detail-item">
              <i className="fas fa-calendar"></i>
              <span>Member since {formatDate(user.created_at)}</span>
            </div>
            <div className="detail-item">
              <i className="fas fa-clock"></i>
              <span>Last login: {formatDate(user.last_login_at, true) || 'First login'}</span>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <h3>{stats.patients_count}</h3>
              <p>Patients</p>
            </div>
            <div className="stat-card">
              <h3>{stats.assessments_count}</h3>
              <p>Assessments</p>
            </div>
          </div>

          <div className="profile-actions">
            <button onClick={handleEditProfile} className="btn-outline btn-full">
              <i className="fas fa-edit"></i>
              Edit Profile
            </button>
          </div>
        </div>

        {/* Professional Information & Activity */}
        <div className="profile-content">
          {/* Professional Information */}
          <div className="info-card">
            <h3 className="section-title">
              <i className="fas fa-briefcase"></i>
              Professional Information
            </h3>

            <div className="info-grid">
              <div className="info-item">
                <p className="info-label">SPECIALIZATION</p>
                <p className="info-value">{user.specialization || 'Not specified'}</p>
              </div>
              <div className="info-item">
                <p className="info-label">LICENSE NUMBER</p>
                <p className="info-value">{user.license_number || 'Not specified'}</p>
              </div>
              <div className="info-item">
                <p className="info-label">INSTITUTION</p>
                <p className="info-value">{user.institution || 'Not specified'}</p>
              </div>
              <div className="info-item">
                <p className="info-label">ACCOUNT STATUS</p>
                <p className="info-value">
                  <span className="status-badge active">
                    <span className="status-dot"></span>
                    Active
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="activity-card">
            <h3 className="section-title">
              <i className="fas fa-history"></i>
              Recent Activity
            </h3>

            {stats.patients_count > 0 || stats.assessments_count > 0 ? (
              <div className="recent-activity-list">
                <div className="activity-item">
                  <i className="fas fa-user-plus"></i>
                  <div>
                    <strong>{stats.patients_count}</strong> patients registered
                  </div>
                </div>
                <div className="activity-item">
                  <i className="fas fa-stethoscope"></i>
                  <div>
                    <strong>{stats.assessments_count}</strong> assessments performed
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <i className="fas fa-history empty-icon"></i>
                <p>No activity recorded yet</p>
                <p className="small-text">Start by registering patients or performing assessments</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;