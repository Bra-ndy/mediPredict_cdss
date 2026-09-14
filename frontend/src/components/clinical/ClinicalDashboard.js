import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './ClinicalDashboard.css';

const ClinicalDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_patients: 0,
    today_assessments: 0,
    total_assessments: 0,
    pending_reports: 0
  });
  
  const [recentPatients, setRecentPatients] = useState([]);
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentDateTime, setCurrentDateTime] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    console.log('ClinicalDashboard mounted, user:', user);
    
    if (user?.role === 'admin') {
      console.log('🚀 Admin user detected - redirecting to admin dashboard');
      window.location.href = '/admin/dashboard';
      return;
    }
    
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.log('No token found, redirecting to login');
      window.location.href = '/login';
      return;
    }
    
    fetchDashboardData();
    updateDateTime();
    
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [statsRes, recentPatientsRes, recentAssessmentsRes, userRes] = await Promise.all([
        api.get('/clinical/stats'),
        api.get('/clinical/recent-patients?limit=3'),
        api.get('/clinical/recent-assessments?limit=3'),
        api.get('/auth/me')
      ]);
      
      setStats(statsRes.data);
      setRecentPatients(recentPatientsRes.data || []);
      setRecentAssessments(recentAssessmentsRes.data || []);
      setCurrentUser(userRes.data);
      setError('');
    } catch (err) {
      if (err.response?.status === 403) {
        console.log('Access forbidden - redirecting to admin dashboard');
        window.location.href = '/admin/dashboard';
      } else {
        setError('Failed to load dashboard data. Please refresh the page.');
        console.error('Dashboard error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateDateTime = () => {
    const now = new Date();
    const options = { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    };
    setCurrentDateTime(now.toLocaleDateString('en-US', options));
  };

  const getFirstName = (fullName) => {
    if (!fullName) return '';
    return fullName.split(' ')[0];
  };

  const getInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return '??';
    const first = firstName ? firstName.charAt(0) : '';
    const last = lastName ? lastName.charAt(0) : '';
    return (first + last).toUpperCase();
  };

  if (loading) {
    return (
      <div className="clinical-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (user?.role === 'admin') {
    return null;
  }

  return (
    <div className="clinical-dashboard">
      {/* White container wrapper for all content */}
      <div className="dashboard-content" style={{ background: 'white', borderRadius: '16px', padding: '2rem' }}>
        {/* Welcome Section */}
        <div className="welcome-section">
          <div className="welcome-left">
            <h1>
              <i className="fas fa-hand-wave"></i>
              Welcome back, {currentUser ? getFirstName(currentUser.full_name) : 'Clinician'}
            </h1>
            <p>Clinical Decision Support System</p>
          </div>
          <div className="welcome-right">
            <div className="date">
              <i className="fas fa-calendar"></i>
              {currentDateTime}
            </div>
            <div className="role-badge">
              <i className="fas fa-user-md"></i>
              {currentUser?.role?.charAt(0).toUpperCase() + currentUser?.role?.slice(1) || 'Clinician'}
            </div>
          </div>
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

        {/* Stats Grid - White Cards with Colored Borders */}
        <div className="stats-grid">
          <div className="stat-card patients">
            <div className="stat-content">
              <div className="stat-value">{stats.total_patients}</div>
              <div className="stat-label">TOTAL PATIENTS</div>
            </div>
          </div>
          
          <div className="stat-card today">
            <div className="stat-content">
              <div className="stat-value">{stats.today_assessments}</div>
              <div className="stat-label">TODAY'S ASSESSMENTS</div>
            </div>
          </div>
          
          <div className="stat-card total">
            <div className="stat-content">
              <div className="stat-value">{stats.total_assessments}</div>
              <div className="stat-label">TOTAL ASSESSMENTS</div>
            </div>
          </div>
          
          <div className="stat-card pending">
            <div className="stat-content">
              <div className="stat-value">{stats.pending_reports}</div>
              <div className="stat-label">PENDING REPORTS</div>
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="quick-actions-section">
          <div className="section-header">
            <i className="fas fa-bolt"></i>
            <h2>Quick Actions</h2>
          </div>
          
          <div className="actions-grid">
            <Link to="/clinical/register-patient" className="action-card">
              <h3>Register Patient</h3>
              <p>Add a new patient to the system</p>
            </Link>
            
            <Link to="/clinical/patient-search" className="action-card">
              <h3>Find Patient</h3>
              <p>Search for existing patients</p>
            </Link>
            
            <Link to="/clinical/patient-search" className="action-card">
              <h3>New Assessment</h3>
              <p>Start a clinical assessment</p>
            </Link>
          </div>
        </div>

        {/* Recent Activity Section */}
        {(recentPatients.length > 0 || recentAssessments.length > 0) && (
          <div className="recent-section">
            <div className="recent-header">
              <h3>
                <i className="fas fa-history"></i>
                Recent Activity
              </h3>
              <Link to="/clinical/patient-search" className="view-link">
                View All <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
            
            <div className="activity-list">
              {recentPatients.map((patient) => (
                <Link 
                  key={`patient-${patient.id}`}
                  to={`/clinical/view-patient/${patient.id}`} 
                  className="activity-item"
                >
                  <div className="activity-avatar">
                    {getInitials(patient.first_name, patient.last_name)}
                  </div>
                  <div className="activity-details">
                    <div className="activity-title">New patient registered</div>
                    <div className="activity-meta">
                      <span><i className="fas fa-user"></i> {patient.full_name || `${patient.first_name} ${patient.last_name}`}</span>
                      <span><i className="fas fa-clock"></i> {new Date(patient.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <span className="activity-badge">Patient</span>
                </Link>
              ))}
              
              {recentAssessments.map((assessment) => (
                <Link 
                  key={`assessment-${assessment.id}`}
                  to={`/clinical/view-assessment/${assessment.patient_id}/${assessment.id}`} 
                  className="activity-item"
                >
                  <div className="activity-avatar">
                    <i className="fas fa-stethoscope"></i>
                  </div>
                  <div className="activity-details">
                    <div className="activity-title">New assessment completed</div>
                    <div className="activity-meta">
                      <span><i className="fas fa-user"></i> {assessment.patient_name || 'Patient'}</span>
                      <span><i className="fas fa-clock"></i> {new Date(assessment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <span className="activity-badge">Assessment</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicalDashboard;