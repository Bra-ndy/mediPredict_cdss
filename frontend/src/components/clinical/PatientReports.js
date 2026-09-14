import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import './PatientReports.css';
import { formatLocalDate, formatTableDate, formatTableDateTime } from '../../utils/dateUtils';

const PatientReports = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();

  // State for patient data
  const [patient, setPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [assessments, setAssessments] = useState([]);
  
  // State for report generation
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [reportType, setReportType] = useState('clinical');
  const [reportFormat, setReportFormat] = useState('html');
  const [generating, setGenerating] = useState(false);
  
  // State for loading and errors
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [downloading, setDownloading] = useState(false);

  // Fetch patient data and reports on component mount
  useEffect(() => {
    fetchPatientData();
    fetchReports();
    fetchAssessments();
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      const response = await api.get(`/clinical/patients/${patientId}`);
      setPatient(response.data);
    } catch (err) {
      console.error('Error fetching patient:', err);
      setError('Failed to load patient data');
    }
  };

  const fetchReports = async () => {
    try {
      const response = await api.get(`/clinical/patients/${patientId}/reports`);
      setReports(response.data);
      console.log('Reports fetched:', response.data);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssessments = async () => {
    try {
      const response = await api.get(`/clinical/patients/${patientId}/assessments`);
      setAssessments(response.data);
      console.log('Assessments fetched:', response.data);
    } catch (err) {
      console.error('Error fetching assessments:', err);
    }
  };

  // Generate a new report
  const generateReport = async () => {
    setGenerating(true);
    setError('');
    
    try {
      const reportData = {
        assessment_id: selectedAssessmentId || null,
        report_type: reportType,
        report_format: reportFormat
      };
      
      console.log('Generating report with data:', reportData);
      
      const response = await api.post(`/clinical/patients/${patientId}/reports`, reportData);
      console.log('Report generation response:', response.data);
      
      setSuccess('Report generated successfully!');
      setShowGenerateModal(false);
      
      // Reset form
      setSelectedAssessmentId('');
      setReportType('clinical');
      setReportFormat('html');
      
      // Refresh reports list
      fetchReports();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  // Download report - triggers file download without opening new window
  const downloadReport = async (reportId) => {
    setDownloading(true);
    setError('');
    
    try {
      // Get the report first to get its content
      const response = await api.get(`/clinical/reports/${reportId}`);
      const reportData = response.data;
      
      // Create a blob from the content
      const blob = new Blob([reportData.report_content], { type: 'text/html' });
      
      // Create a download link - this triggers download, not new window
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${reportData.report_id}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess('Report downloaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Error downloading report:', err);
      setError('Failed to download report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // View report in same tab - navigates to report view page
  const viewReport = (reportId) => {
    navigate(`/clinical/view-report/${patientId}/${reportId}`);
  };

  // Mark report as printed
  const markAsPrinted = async (reportId) => {
    try {
      await api.post(`/clinical/reports/${reportId}/mark-printed`);
      fetchReports(); // Refresh the list
      setSuccess('Report marked as printed');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error marking report:', err);
      setError('Failed to mark report as printed');
    }
  };

  // Format date - uses local Kenya timezone
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return formatLocalDate(dateString, true);
  };

  if (loading) {
    return (
      <div className="reports-loading">
        <div className="loading-spinner"></div>
        <p>Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="patient-reports">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>
            <i className="fas fa-file-alt"></i>
            Patient Reports
          </h1>
          <p className="patient-info">
            Patient: <strong>{patient?.full_name || `${patient?.first_name} ${patient?.last_name}`}</strong> 
            ({patient?.patient_id || patient?.id})
          </p>
        </div>
        <div className="header-actions">
          <button 
            className="btn-primary"
            onClick={() => setShowGenerateModal(true)}
          >
            <i className="fas fa-plus"></i>
            Generate New Report
          </button>
          <Link to={`/clinical/view-patient/${patientId}`} className="btn-outline">
            <i className="fas fa-arrow-left"></i>
            Back to Patient
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle"></i>
          {error}
          <button onClick={() => setError('')} className="close-alert">×</button>
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          <i className="fas fa-check-circle"></i>
          {success}
          <button onClick={() => setSuccess('')} className="close-alert">×</button>
        </div>
      )}

      {/* Reports Table */}
      <div className="reports-card">
        <div className="reports-header">
          <h3 className="section-title">
            <i className="fas fa-history"></i>
            Generated Reports
          </h3>
          <span className="total-count">{reports.length} report(s)</span>
        </div>
        
        {reports.length > 0 ? (
          <div className="table-responsive">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Date Generated</th>
                  <th>Type</th>
                  <th>Format</th>
                  <th>Generated By</th>
                  <th>Status</th>
                  <th>Actions</th>
                  </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <div className="report-id">
                        <i className="fas fa-file-alt"></i>
                        {report.report_id}
                      </div>
                    </td>
                    <td>{formatDate(report.generated_at)}</td>
                    <td>
                      <span className="type-badge">
                        {report.report_type === 'clinical' ? 'Clinical' : 'Assessment'}
                      </span>
                    </td>
                    <td>
                      <span className="format-badge">
                        {report.report_format?.toUpperCase() || 'HTML'}
                      </span>
                    </td>
                    <td>{report.generated_by_user?.full_name || 'Unknown'}</td>
                    <td>
                      {report.is_printed ? (
                        <div className="status-printed">
                          <i className="fas fa-print"></i>
                          <span>Printed</span>
                          <small>{formatDate(report.printed_at)}</small>
                        </div>
                      ) : (
                        <div className="status-pending">
                          <i className="fas fa-clock"></i>
                          <span>Pending</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => downloadReport(report.id)}
                          className="action-btn download-btn"
                          title="Download Report"
                          disabled={downloading}
                        >
                          <i className="fas fa-download"></i>
                          <span className="btn-text">
                            {downloading ? 'Downloading...' : 'Download'}
                          </span>
                        </button>
                        <button
                          onClick={() => viewReport(report.id)}
                          className="action-btn view-btn"
                          title="View Report"
                        >
                          <i className="fas fa-eye"></i>
                          <span className="btn-text">View</span>
                        </button>
                        {!report.is_printed && (
                          <button
                            onClick={() => markAsPrinted(report.id)}
                            className="action-btn print-btn"
                            title="Mark as Printed"
                          >
                            <i className="fas fa-print"></i>
                            <span className="btn-text">Mark Printed</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <i className="fas fa-file-alt empty-icon"></i>
            <h3>No Reports Yet</h3>
            <p>Generate your first report for this patient</p>
            <button 
              className="btn-primary"
              onClick={() => setShowGenerateModal(true)}
            >
              <i className="fas fa-plus"></i>
              Generate Report
            </button>
          </div>
        )}
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-file-alt"></i>
                Generate New Report
              </h3>
              <button className="modal-close" onClick={() => setShowGenerateModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Assessment (Optional)</label>
                <select 
                  value={selectedAssessmentId} 
                  onChange={(e) => setSelectedAssessmentId(e.target.value)}
                >
                  <option value="">Latest Assessment (Auto)</option>
                  {assessments.map((assessment) => (
                    <option key={assessment.id} value={assessment.id}>
                      {formatDate(assessment.assessment_date)} - 
                      BP: {assessment.systolic_bp}/{assessment.diastolic_bp} | 
                      Glucose: {assessment.fasting_glucose}
                    </option>
                  ))}
                </select>
                <small>Leave empty to use the most recent assessment</small>
                {assessments.length === 0 && (
                  <div className="warning-text">
                    <i className="fas fa-exclamation-triangle"></i> No assessments found for this patient. Please perform an assessment first.
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label>Report Type</label>
                <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
                  <option value="clinical">Clinical Report</option>
                  <option value="assessment">Assessment Summary</option>
                </select>
                <small>
                  {reportType === 'clinical' 
                    ? 'Clinical Report - Full patient assessment details' 
                    : 'Assessment Summary - Key vitals and AI recommendation only'}
                </small>
              </div>
              
              <div className="form-group">
                <label>Report Format</label>
                <select value={reportFormat} onChange={(e) => setReportFormat(e.target.value)}>
                  <option value="html">HTML (Web View)</option>
                  <option value="pdf">PDF (Download)</option>
                </select>
              </div>
              
              <div className="report-preview">
                <h4>Report Preview</h4>
                <p><strong>Patient:</strong> {patient?.full_name}</p>
                <p><strong>Patient ID:</strong> {patient?.patient_id}</p>
                <p><strong>Report Type:</strong> {reportType === 'clinical' ? 'Clinical Report' : 'Assessment Summary'}</p>
                <p><strong>Format:</strong> {reportFormat.toUpperCase()}</p>
                <p><strong>Generated:</strong> {new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</p>
                {selectedAssessmentId && (
                  <p><strong>Using Assessment:</strong> ID: {selectedAssessmentId}</p>
                )}
                {!selectedAssessmentId && assessments.length > 0 && (
                  <p><strong>Using:</strong> Most recent assessment</p>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-outline" 
                onClick={() => setShowGenerateModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={generateReport}
                disabled={generating || (assessments.length === 0 && !selectedAssessmentId)}
              >
                <i className="fas fa-file-alt"></i>
                {generating ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientReports;