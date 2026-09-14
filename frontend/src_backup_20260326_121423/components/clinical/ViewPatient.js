import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import './ViewPatient.css';

const ViewPatient = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();

  // State for patient data
  const [patient, setPatient] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [registeredBy, setRegisteredBy] = useState(null);
  
  // State for loading and errors
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch patient data on component mount
  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch patient details and assessments in parallel
      const [patientRes, assessmentsRes] = await Promise.all([
        api.get(`/clinical/patients/${patientId}`),
        api.get(`/clinical/patients/${patientId}/assessments`)
      ]);
      
      setPatient(patientRes.data);
      setAssessments(assessmentsRes.data || []);
      
      // FIXED: Better error handling for fetching user details
      if (patientRes.data.registered_by) {
        try {
          // Try to fetch user by ID if registered_by is a number
          const userId = patientRes.data.registered_by;
          
          // Check if it's a valid ID (number) or username
          if (!isNaN(userId)) {
            // It's an ID, fetch by ID
            const userRes = await api.get(`/users/${userId}`);
            setRegisteredBy(userRes.data);
          } else {
            // It might be a username, try a different endpoint
            try {
              const userRes = await api.get(`/users/username/${userId}`);
              setRegisteredBy(userRes.data);
            } catch (usernameErr) {
              console.warn('Could not fetch user by username:', userId);
              setRegisteredBy({ 
                full_name: patientRes.data.registered_by_name || 'Unknown User',
                id: patientRes.data.registered_by 
              });
            }
          }
        } catch (err) {
          console.error('Error fetching registered by user:', err);
          setRegisteredBy({ 
            full_name: 'User unavailable',
            id: patientRes.data.registered_by 
          });
        }
      }
      
    } catch (err) {
      setError('Failed to load patient details. Please try again.');
      console.error('Error fetching patient:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get patient initials for avatar
  const getInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return '??';
    const first = firstName ? firstName.charAt(0) : '';
    const last = lastName ? lastName.charAt(0) : '';
    return (first + last).toUpperCase();
  };

  // Format date
  const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return 'N/A';
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
  };

  // Format full address
  const getFullAddress = (patient) => {
    const parts = [
      patient.address_line1,
      patient.address_line2,
      patient.city,
      patient.state,
      patient.postal_code,
      patient.country
    ].filter(part => part && part.trim() !== '');
    
    return parts.length > 0 ? parts.join(', ') : 'No address provided';
  };

  if (loading) {
    return (
      <div className="view-patient-loading">
        <div className="loading-spinner"></div>
        <p>Loading patient details...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="view-patient-error">
        <i className="fas fa-exclamation-circle"></i>
        <h3>Patient Not Found</h3>
        <p>The requested patient could not be found.</p>
        <Link to="/clinical/patient-search" className="btn-primary">
          Back to Patient Search
        </Link>
      </div>
    );
  }

  return (
    <div className="view-patient">
      {/* Header */}
      <div className="page-header">
        <h1>
          <i className="fas fa-user-injured"></i>
          Patient Details
        </h1>
        <div className="header-actions">
          <Link to={`/clinical/assess-patient/${patientId}`} className="btn-primary">
            <i className="fas fa-stethoscope"></i>
            New Assessment
          </Link>
          <Link to={`/clinical/edit-patient/${patientId}`} className="btn-outline">
            <i className="fas fa-edit"></i>
            Edit Patient
          </Link>
          <Link to={`/clinical/patient-reports/${patientId}`} className="btn-outline">
            <i className="fas fa-file-alt"></i>
            View Reports
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle"></i>
          {error}
          <button onClick={fetchPatientData} className="retry-btn">
            <i className="fas fa-sync-alt"></i> Retry
          </button>
        </div>
      )}

      <div className="patient-grid">
        {/* Patient Information Card */}
        <div className="info-card">
          <h3 className="section-title">
            <i className="fas fa-id-card"></i>
            Patient Information
          </h3>
          
          <div className="patient-header">
            <div className="patient-avatar">
              {getInitials(patient.first_name, patient.last_name)}
            </div>
            <div className="patient-name-section">
              <h2>{patient.full_name || `${patient.first_name} ${patient.last_name}`}</h2>
              <p className="patient-id">{patient.patient_id || patient.id}</p>
            </div>
          </div>
          
          <div className="info-grid">
            <div className="info-item">
              <p className="info-label">DATE OF BIRTH</p>
              <p className="info-value">
                {formatDate(patient.date_of_birth)} ({calculateAge(patient.date_of_birth)} years)
              </p>
            </div>
            <div className="info-item">
              <p className="info-label">GENDER</p>
              <p className="info-value">{patient.gender}</p>
            </div>
            <div className="info-item">
              <p className="info-label">MARITAL STATUS</p>
              <p className="info-value">{patient.marital_status || 'Not specified'}</p>
            </div>
            <div className="info-item">
              <p className="info-label">OCCUPATION</p>
              <p className="info-value">{patient.occupation || 'Not specified'}</p>
            </div>
          </div>
          
          <hr className="divider" />
          
          <h4 className="subsection-title">
            <i className="fas fa-address-book"></i>
            Contact Information
          </h4>
          
          <div className="info-grid">
            <div className="info-item">
              <p className="info-label">PHONE</p>
              <p className="info-value">{patient.phone_number}</p>
              {patient.alternate_phone && (
                <small className="alt-phone">Alt: {patient.alternate_phone}</small>
              )}
            </div>
            <div className="info-item">
              <p className="info-label">EMAIL</p>
              <p className="info-value">{patient.email || 'Not provided'}</p>
            </div>
            <div className="info-item full-width">
              <p className="info-label">ADDRESS</p>
              <p className="info-value">{getFullAddress(patient)}</p>
            </div>
          </div>
          
          <hr className="divider" />
          
          <h4 className="subsection-title">
            <i className="fas fa-ambulance"></i>
            Emergency Contact
          </h4>
          
          {patient.emergency_contact_name ? (
            <div className="info-grid">
              <div className="info-item">
                <p className="info-label">CONTACT NAME</p>
                <p className="info-value">{patient.emergency_contact_name}</p>
              </div>
              <div className="info-item">
                <p className="info-label">CONTACT PHONE</p>
                <p className="info-value">{patient.emergency_contact_phone}</p>
              </div>
              <div className="info-item">
                <p className="info-label">RELATIONSHIP</p>
                <p className="info-value">{patient.emergency_contact_relation}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted">No emergency contact information provided</p>
          )}
        </div>

        {/* Medical Information Card */}
        <div className="info-card">
          <h3 className="section-title">
            <i className="fas fa-notes-medical"></i>
            Medical Information
          </h3>
          
          <div className="info-grid">
            <div className="info-item">
              <p className="info-label">BLOOD TYPE</p>
              <p className="info-value blood-type">{patient.blood_type || 'Not specified'}</p>
            </div>
            <div className="info-item">
              <p className="info-label">STATUS</p>
              <p className="info-value">
                {patient.is_active ? (
                  <span className="status-badge active">
                    <span className="status-dot"></span>
                    Active
                  </span>
                ) : (
                  <span className="status-badge inactive">
                    <span className="status-dot"></span>
                    Inactive
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="medical-section">
            <p className="info-label">ALLERGIES</p>
            {patient.allergies ? (
              <div className="allergy-box">
                <p className="info-value">{patient.allergies}</p>
              </div>
            ) : (
              <p className="text-muted">No known allergies</p>
            )}
          </div>
          
          <div className="medical-section">
            <p className="info-label">CHRONIC CONDITIONS</p>
            {patient.chronic_conditions ? (
              <p className="info-value">{patient.chronic_conditions}</p>
            ) : (
              <p className="text-muted">None reported</p>
            )}
          </div>
          
          <div className="medical-section">
            <p className="info-label">CURRENT MEDICATIONS</p>
            {patient.current_medications ? (
              <div className="medications-box">
                <p className="info-value">{patient.current_medications}</p>
              </div>
            ) : (
              <p className="text-muted">No current medications</p>
            )}
          </div>
          
          <hr className="divider" />
          
          <h4 className="subsection-title">
            <i className="fas fa-file-invoice"></i>
            Insurance Information
          </h4>
          
          <div className="info-grid">
            <div className="info-item">
              <p className="info-label">PROVIDER</p>
              <p className="info-value">{patient.insurance_provider || 'Not specified'}</p>
            </div>
            <div className="info-item">
              <p className="info-label">POLICY NUMBER</p>
              <p className="info-value">{patient.insurance_number || 'Not specified'}</p>
            </div>
          </div>
          
          <hr className="divider" />
          
          <div className="registration-info">
            <span>Registered by: {registeredBy?.full_name || registeredBy?.username || patient.registered_by_name || 'Unknown'}</span>
            <span>Registered on: {formatDate(patient.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Assessment History */}
      <div className="assessments-card">
        <div className="assessments-header">
          <h3 className="section-title">
            <i className="fas fa-history"></i>
            Assessment History
          </h3>
          <Link to={`/clinical/patient-reports/${patientId}`} className="btn-reports">
            <i className="fas fa-file-alt"></i>
            View All Reports
          </Link>
        </div>
        
        {assessments.length > 0 ? (
          <>
            <div className="table-responsive">
              <table className="assessments-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Assessed By</th>
                    <th>BP</th>
                    <th>Glucose</th>
                    <th>BMI</th>
                    <th>Recommendation</th>
                    <th>Confidence</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((assessment) => (
                    <tr key={assessment.id}>
                      <td>{formatDate(assessment.assessment_date, true)}</td>
                      <td>{assessment.assessed_by?.full_name || 'Unknown'}</td>
                      <td>{assessment.systolic_bp || '—'}/{assessment.diastolic_bp || '—'}</td>
                      <td>{assessment.fasting_glucose || '—'}</td>
                      <td>{assessment.bmi || '—'}</td>
                      <td className="recommendation">
                        {assessment.ai_recommended_drug || 'Pending'}
                      </td>
                      <td>
                        {assessment.ai_confidence && (
                          <span className="confidence-badge">
                            {assessment.ai_confidence}%
                          </span>
                        )}
                      </td>
                      <td>
                        {assessment.is_completed ? (
                          <span className="status-completed">Completed</span>
                        ) : (
                          <span className="status-pending">Pending</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <Link
                            to={`/clinical/view-assessment/${patientId}/${assessment.id}`}
                            className="action-btn view-btn"
                            title="View Assessment"
                          >
                            <i className="fas fa-eye"></i>
                            <span className="btn-text">View</span>
                          </Link>
                          {/* Reports button - opens in same tab */}
                          <Link
                            to={`/clinical/patient-reports/${patientId}`}
                            className="action-btn report-btn"
                            title="View Reports"
                          >
                            <i className="fas fa-file-alt"></i>
                            <span className="btn-text">Reports</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <i className="fas fa-stethoscope empty-icon"></i>
            <p>No assessments recorded for this patient</p>
            <Link to={`/clinical/assess-patient/${patientId}`} className="btn-primary">
              <i className="fas fa-stethoscope"></i>
              Perform First Assessment
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to calculate age
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

export default ViewPatient;