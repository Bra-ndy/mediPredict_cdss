import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import './PatientSearch.css';

const PatientSearch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  // State for filters
  const [searchQuery, setSearchQuery] = useState(queryParams.get('search') || '');
  const [currentPage, setCurrentPage] = useState(parseInt(queryParams.get('page')) || 1);
  
  // State for patient data
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({
    total_patients: 0,
    active_patients: 0,
    today_assessments: 0,
    pending_reports: 0
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // State for loading and errors
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch patients on component mount and when URL params change
  useEffect(() => {
    fetchPatients();
    fetchStats();
  }, [location.search]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(location.search);
      
      const response = await api.get(`/clinical/patients?${params}`);
      
      setPatients(response.data.patients || []);
      setTotalPages(response.data.total_pages || 1);
      setTotalRecords(response.data.total_records || 0);
      setError('');
    } catch (err) {
      setError('Failed to load patients. Please refresh the page.');
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/clinical/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Handle search form submission (Enter key or Search button)
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    const params = new URLSearchParams({
      ...(searchQuery && { search: searchQuery }),
      page: 1
    });
    navigate(`/clinical/patient-search?${params}`);
  };

  // Handle input change - just update state, don't search
  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle key press - search on Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
    navigate('/clinical/patient-search');
  };

  // Handle page change
  const changePage = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      const params = new URLSearchParams({
        ...(searchQuery && { search: searchQuery }),
        page: newPage
      });
      navigate(`/clinical/patient-search?${params}`);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '/');
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate age from date of birth
  const calculateAge = (dob) => {
    if (!dob) return 0;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Get pagination range
  const getPaginationRange = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  };

  if (loading && patients.length === 0) {
    return (
      <div className="patient-search-loading">
        <div className="loading-spinner"></div>
        <p>Loading patient records...</p>
      </div>
    );
  }

  return (
    <div className="patient-search">
      {/* White container wrapper for all content */}
      <div className="patient-search-content">
        
        {/* Page Header */}
        <div className="page-header">
          <h1>
            <span className="page-header-icon">
              <i className="fas fa-users"></i>
            </span>
            Patient Directory
          </h1>
          <p className="record-count">{patients.length} of {totalRecords} records</p>
        </div>

        {/* Stats Grid - White Cards with Colored Left Borders */}
        <div className="stats-grid">
          <div className="stat-card patients">
            <div className="stat-content">
              <div className="stat-value">{stats.total_patients}</div>
              <div className="stat-label">TOTAL PATIENTS</div>
            </div>
          </div>
          
          <div className="stat-card active">
            <div className="stat-content">
              <div className="stat-value">{stats.active_patients}</div>
              <div className="stat-label">ACTIVE PATIENTS</div>
            </div>
          </div>
          
          <div className="stat-card assessments">
            <div className="stat-content">
              <div className="stat-value">{stats.today_assessments}</div>
              <div className="stat-label">TODAY'S ASSESSMENTS</div>
            </div>
          </div>
          
          <div className="stat-card pending">
            <div className="stat-content">
              <div className="stat-value">{stats.pending_reports}</div>
              <div className="stat-label">PENDING REPORTS</div>
            </div>
          </div>
        </div>

        {/* Search Card */}
        <div className="search-card">
          <div className="section-header">
            <i className="fas fa-search"></i>
            <h2>Find Patients</h2>
          </div>
          
          <form onSubmit={handleSearch}>
            <div className="search-grid">
              <div className="search-input-group">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  className="search-input"
                  value={searchQuery}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Search by ID, name, phone number, or email..."
                />
              </div>
              <button type="submit" className="btn-primary">
                <i className="fas fa-search"></i> Search
              </button>
              <Link to="/clinical/register-patient" className="btn-secondary">
                <i className="fas fa-user-plus"></i> New Patient
              </Link>
            </div>
          </form>
          <small className="search-hint">Press Enter to search</small>
        </div>

        {/* Patients Card - ADDED TITLE SECTION WITH INLINE STYLES */}
        <div className="patients-card">
          {/* PATIENT INFORMATION TITLE - WITH INLINE CSS FOR VISIBILITY */}
          <div 
            className="card-title-section"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.25rem 2rem',
              background: 'white',
              borderBottom: '2px solid #e2e8f0',
              marginBottom: 0
            }}
          >
            <h3 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              <i className="fas fa-address-card" style={{
                color: '#2563eb',
                background: 'rgba(37, 99, 235, 0.1)',
                padding: '0.6rem',
                borderRadius: '12px',
                fontSize: '1rem'
              }}></i>
              Patient Information
            </h3>
            {patients.length > 0 && (
              <span style={{
                background: '#f1f5f9',
                padding: '0.4rem 1rem',
                borderRadius: '40px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#334155',
                letterSpacing: '0.3px'
              }}>
                {patients.length} active {patients.length === 1 ? 'record' : 'records'}
              </span>
            )}
          </div>
          
          {error && (
            <div className="error-alert">
              <i className="fas fa-exclamation-circle"></i>
              {error}
              <button onClick={fetchPatients} className="retry-btn">
                <i className="fas fa-sync-alt"></i> Retry
              </button>
            </div>
          )}
          
          {patients.length > 0 ? (
            <>
              <div className="table-wrapper">
                <table className="patient-table">
                  <thead>
                    <tr>
                      <th>Patient ID</th>
                      <th>Patient Information</th>
                      <th>Contact Details</th>
                      <th>Location</th>
                      <th>Last Visit</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient) => (
                      <tr key={patient.id}>
                        <td>
                          <span className="id-badge">
                            {patient.patient_id || patient.id}
                          </span>
                        </td>
                        <td>
                          <div className="patient-info-cell">
                            <div className="patient-details">
                              <div className="patient-name">{patient.full_name || `${patient.first_name} ${patient.last_name}`}</div>
                              <div className="patient-meta">
                                <span>{formatDate(patient.date_of_birth)}</span>
                                <span>{patient.gender}</span>
                                <span>{calculateAge(patient.date_of_birth)} yrs</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="contact-stack">
                            <div className="contact-item">
                              <i className="fas fa-phone-alt"></i>
                              {patient.phone_number}
                            </div>
                            {patient.email && (
                              <div className="contact-item email">
                                <i className="fas fa-envelope"></i>
                                {patient.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="location-badge">
                            <i className="fas fa-map-marker-alt"></i>
                            {patient.city || 'N/A'}
                          </span>
                        </td>
                        <td>
                          {patient.assessments && patient.assessments.length > 0 ? (
                            <span className="date-badge">
                              <i className="fas fa-calendar-check"></i>
                              {formatDisplayDate(patient.assessments[patient.assessments.length - 1].assessment_date)}
                            </span>
                          ) : (
                            <span className="no-visit">
                              <i className="fas fa-minus-circle"></i>
                              No visits
                            </span>
                          )}
                        </td>
                        <td>
                          {patient.is_active ? (
                            <span className="status-badge status-active">
                              <span className="status-dot active"></span>
                              Active
                            </span>
                          ) : (
                            <span className="status-badge status-inactive">
                              <span className="status-dot inactive"></span>
                              Inactive
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <Link
                              to={`/clinical/view-patient/${patient.id}`}
                              className="action-btn view-btn"
                              title="View Patient"
                            >
                              <i className="fas fa-eye"></i>
                              <span className="btn-text">View</span>
                            </Link>
                            <Link
                              to={`/clinical/assess-patient/${patient.id}`}
                              className="action-btn assess-btn"
                              title="New Assessment"
                            >
                              <i className="fas fa-stethoscope"></i>
                              <span className="btn-text">Assess</span>
                            </Link>
                            <Link
                              to={`/clinical/patient-reports/${patient.id}`}
                              className="action-btn report-btn"
                              title="Reports"
                            >
                              <i className="fas fa-file-alt"></i>
                              <span className="btn-text">Reports</span>
                            </Link>
                            <Link
                              to={`/clinical/edit-patient/${patient.id}`}
                              className="action-btn edit-btn"
                              title="Edit"
                            >
                              <i className="fas fa-edit"></i>
                              <span className="btn-text">Edit</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="page-item"
                    onClick={() => changePage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  
                  {getPaginationRange().map((item, index) => (
                    item === '...' ? (
                      <span key={`ellipsis-${index}`} className="page-item disabled">...</span>
                    ) : (
                      <button
                        key={item}
                        className={`page-item ${item === currentPage ? 'active' : ''}`}
                        onClick={() => changePage(item)}
                      >
                        {item}
                      </button>
                    )
                  ))}
                  
                  <button
                    className="page-item"
                    onClick={() => changePage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <i className="fas fa-users"></i>
              </div>
              {searchQuery ? (
                <>
                  <h3>No patients found</h3>
                  <p>No results match your search "{searchQuery}"</p>
                  <button onClick={clearSearch} className="btn-secondary">
                    <i className="fas fa-times"></i> Clear Search
                  </button>
                </>
              ) : (
                <>
                  <h3>No patients yet</h3>
                  <p>Start by registering your first patient in the system</p>
                  <Link to="/clinical/register-patient" className="btn-primary">
                    <i className="fas fa-user-plus"></i> Register Patient
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientSearch;