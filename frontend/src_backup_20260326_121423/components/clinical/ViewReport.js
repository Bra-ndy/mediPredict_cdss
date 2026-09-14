import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import './ViewReport.css';

const ViewReport = () => {
  const { patientId, reportId } = useParams();
  const navigate = useNavigate();
  const reportContentRef = useRef(null);

  // State for report data
  const [report, setReport] = useState(null);
  const [patient, setPatient] = useState(null);
  const [assessment, setAssessment] = useState(null);
  
  // State for loading and errors
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch report data on component mount
  useEffect(() => {
    fetchReportData();
  }, [reportId, patientId]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Fetch report details
      const response = await api.get(`/clinical/reports/${reportId}`);
      setReport(response.data);
      
      // Fetch patient details
      if (patientId) {
        const patientRes = await api.get(`/clinical/patients/${patientId}`);
        setPatient(patientRes.data);
      }
      
      // Fetch associated assessment if available
      if (response.data.assessment_id) {
        try {
          const assessmentRes = await api.get(`/clinical/assessments/${response.data.assessment_id}`);
          setAssessment(assessmentRes.data);
        } catch (err) {
          console.error('Error fetching assessment:', err);
        }
      }
      
      setError('');
    } catch (err) {
      setError('Failed to load report. Please try again.');
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle print report
  const handlePrint = () => {
    if (reportContentRef.current) {
      const printContent = reportContentRef.current.innerHTML;
      const originalTitle = document.title;
      
      // Create print window
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Report ${report?.report_id || ''}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            <style>
              @media print {
                body { 
                  font-family: Arial, sans-serif; 
                  margin: 0.5in;
                  color: #333;
                }
                .report-content {
                  max-width: 100%;
                }
                .patient-info-grid, .vital-grid {
                  display: grid;
                  grid-template-columns: repeat(3, 1fr);
                  gap: 1rem;
                  margin: 1rem 0;
                }
                .section-title {
                  border-bottom: 2px solid #2563eb;
                  padding-bottom: 0.5rem;
                  margin: 2rem 0 1rem;
                }
                .ai-recommendation {
                  background: #f3e8ff;
                  padding: 1rem;
                  border-radius: 8px;
                  margin: 1rem 0;
                }
                .footer {
                  margin-top: 2rem;
                  padding-top: 1rem;
                  border-top: 1px solid #ddd;
                  text-align: center;
                  font-size: 0.8rem;
                  color: #666;
                }
              }
            </style>
          </head>
          <body>
            <div class="report-content">
              ${printContent}
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  // Format date
  const formatDate = (dateString, includeTime = true) => {
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

  // Get decision color
  const getDecisionColor = (decision) => {
    switch(decision?.toLowerCase()) {
      case 'accepted':
        return '#10b981';
      case 'modified':
        return '#f59e0b';
      case 'rejected':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  if (loading) {
    return (
      <div className="view-report-loading">
        <div className="loading-spinner"></div>
        <p>Loading report...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="view-report-error">
        <i className="fas fa-exclamation-circle"></i>
        <h3>Report Not Found</h3>
        <p>The requested report could not be found.</p>
        <Link to={`/clinical/patient-reports/${patientId}`} className="btn-primary">
          Back to Reports
        </Link>
      </div>
    );
  }

  return (
    <div className="view-report">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>
            <i className="fas fa-file-alt"></i>
            Clinical Report
          </h1>
          <p className="report-info">
            Report ID: <strong>{report.report_id || report.id}</strong> | 
            Generated: {formatDate(report.generated_at)}
          </p>
        </div>
        <div className="header-actions">
          <button onClick={handlePrint} className="btn-outline">
            <i className="fas fa-print"></i>
            Print Report
          </button>
          <Link to={`/clinical/patient-reports/${patientId}`} className="btn-outline">
            <i className="fas fa-arrow-left"></i>
            Back to Reports
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      {/* Report Content */}
      <div className="report-card" ref={reportContentRef}>
        {/* Header */}
        <div className="report-header">
          <div className="header-left">
            <div className="logo">
              <i className="fas fa-pills"></i>
            </div>
            <div>
              <h2>MediPredict CDSS</h2>
              <p>Clinical Decision Support System</p>
            </div>
          </div>
          <div className="header-right">
            <p className="report-type">{report.report_type || 'CLINICAL'} REPORT</p>
            <p className="report-id-display">{report.report_id || report.id}</p>
          </div>
        </div>

        {/* Patient Information */}
        {patient && (
          <div className="patient-section">
            <h3 className="section-title">
              <i className="fas fa-user-injured"></i>
              PATIENT INFORMATION
            </h3>
            
            <div className="patient-info-grid">
              <div className="info-item">
                <p className="info-label">PATIENT NAME</p>
                <p className="info-value">{patient.full_name || `${patient.first_name} ${patient.last_name}`}</p>
              </div>
              <div className="info-item">
                <p className="info-label">PATIENT ID</p>
                <p className="info-value patient-id">{patient.patient_id || patient.id}</p>
              </div>
              <div className="info-item">
                <p className="info-label">DATE OF BIRTH</p>
                <p className="info-value">{formatDate(patient.date_of_birth, false)} ({patient.age || calculateAge(patient.date_of_birth)} years)</p>
              </div>
              <div className="info-item">
                <p className="info-label">GENDER</p>
                <p className="info-value">{patient.gender}</p>
              </div>
              <div className="info-item">
                <p className="info-label">CONTACT</p>
                <p className="info-value">{patient.phone_number}</p>
              </div>
              <div className="info-item">
                <p className="info-label">BLOOD TYPE</p>
                <p className="info-value">{patient.blood_type || 'Not specified'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Assessment Information */}
        {assessment && (
          <div className="assessment-section">
            <h3 className="section-title">
              <i className="fas fa-stethoscope"></i>
              CLINICAL ASSESSMENT
            </h3>
            
            <div className="assessment-grid">
              <div className="vital-signs">
                <h4>VITAL SIGNS</h4>
                <div className="vital-grid">
                  <div>
                    <p className="info-label">Blood Pressure</p>
                    <p className="info-value">{assessment.systolic_bp || '—'}/{assessment.diastolic_bp || '—'} mmHg</p>
                  </div>
                  <div>
                    <p className="info-label">Heart Rate</p>
                    <p className="info-value">{assessment.heart_rate || '—'} bpm</p>
                  </div>
                  <div>
                    <p className="info-label">BMI</p>
                    <p className="info-value">{assessment.bmi || '—'} kg/m²</p>
                  </div>
                  <div>
                    <p className="info-label">Glucose</p>
                    <p className="info-value">{assessment.fasting_glucose || '—'} mg/dL</p>
                  </div>
                </div>
              </div>
              
              <div className="assessment-details">
                <h4>ASSESSMENT DETAILS</h4>
                <div className="details-box">
                  <p><strong>Date:</strong> {formatDate(assessment.assessment_date)}</p>
                  <p><strong>Assessed By:</strong> {assessment.assessor?.full_name || 'Unknown'}</p>
                  <p><strong>Chief Complaint:</strong> {assessment.chief_complaint || 'Not documented'}</p>
                  <p><strong>Diagnosis:</strong> {assessment.diagnosis || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* AI Recommendation */}
            {assessment.ai_recommended_drug && (
              <div className="ai-recommendation">
                <h4>
                  <i className="fas fa-brain"></i>
                  AI RECOMMENDATION
                </h4>
                <div className="recommendation-content">
                  <div className="drug-header">
                    <span className="drug-name">{assessment.ai_recommended_drug}</span>
                    <span className="confidence-badge">
                      {assessment.ai_confidence}% Confidence
                    </span>
                  </div>
                  
                  {assessment.clinician_decision && (
                    <div className="clinician-decision">
                      <p>
                        <strong>Clinician Decision:</strong>{' '}
                        <span style={{ color: getDecisionColor(assessment.clinician_decision), fontWeight: 600 }}>
                          {assessment.clinician_decision}
                        </span>
                      </p>
                      {assessment.clinician_selected_drug && (
                        <p><strong>Selected Drug:</strong> {assessment.clinician_selected_drug}</p>
                      )}
                      {assessment.clinician_notes && (
                        <p><strong>Clinician Notes:</strong> {assessment.clinician_notes}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="report-footer">
          <p>This report was generated by MediPredict Clinical Decision Support System</p>
          <p>Generated by: {report.generated_by_user?.full_name || 'Unknown'} | {formatDate(report.generated_at)}</p>
          <p className="disclaimer">For professional medical use only. This AI-generated recommendation is for decision support only.</p>
        </div>
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

export default ViewReport;
