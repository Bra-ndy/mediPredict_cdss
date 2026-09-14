import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import './ViewAssessment.css';

const ViewAssessment = () => {
  const { patientId, assessmentId } = useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [patient, setPatient] = useState(null);
  const [interactions, setInteractions] = useState(null);
  
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeForm, setFinalizeForm] = useState({
    clinician_decision: '',
    clinician_selected_drug: '',
    follow_up_date: '',
    clinician_notes: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssessmentData();
  }, [assessmentId, patientId]);

  const fetchAssessmentData = async () => {
    try {
      setLoading(true);
      
      const response = await api.get(`/clinical/assessments/${assessmentId}`);
      setAssessment(response.data);
      
      setFinalizeForm({
        clinician_decision: response.data.clinician_decision || '',
        clinician_selected_drug: response.data.ai_recommended_drug || '',
        follow_up_date: response.data.follow_up_date ? 
          new Date(response.data.follow_up_date).toISOString().split('T')[0] : '',
        clinician_notes: response.data.clinician_notes || ''
      });
      
      if (response.data.ai_recommended_drug && response.data.current_medications) {
        try {
          const interactionsRes = await api.post('/clinical/drug-interactions', {
            drug: response.data.ai_recommended_drug,
            current_medications: response.data.current_medications
          });
          setInteractions(interactionsRes.data);
        } catch (err) {
          console.error('Error fetching drug interactions:', err);
        }
      }
      
      if (patientId) {
        const patientRes = await api.get(`/clinical/patients/${patientId}`);
        setPatient(patientRes.data);
      }
      
      setError('');
    } catch (err) {
      setError('Failed to load assessment details. Please try again.');
      console.error('Error fetching assessment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeChange = (e) => {
    const { name, value } = e.target;
    setFinalizeForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFinalizeSubmit = async (e) => {
    e.preventDefault();
    
    if (!finalizeForm.clinician_decision) {
      alert('Please select a clinician decision');
      return;
    }

    setFinalizing(true);

    try {
      const response = await api.post(
        `/clinical/assessments/${assessmentId}/finalize`,
        finalizeForm
      );
      
      setAssessment(prev => ({
        ...prev,
        ...response.data,
        is_completed: true
      }));
      
      setShowFinalizeModal(false);
      
      alert('Assessment finalized successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to finalize assessment. Please try again.');
    } finally {
      setFinalizing(false);
    }
  };

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

  const getVitalStatus = (value, type) => {
    if (!value) return 'normal';
    
    switch(type) {
      case 'bp':
        if (value.systolic >= 140 || value.diastolic >= 90) return 'high';
        if (value.systolic >= 130 || value.diastolic >= 80) return 'elevated';
        return 'normal';
      case 'heart_rate':
        if (value > 100) return 'high';
        if (value < 60) return 'elevated';
        return 'normal';
      case 'temperature':
        if (value > 38) return 'high';
        if (value > 37.5) return 'elevated';
        return 'normal';
      case 'oxygen':
        if (value < 90) return 'high';
        if (value < 95) return 'elevated';
        return 'normal';
      default:
        return 'normal';
    }
  };

  const getInteractionClass = (severity) => {
    switch(severity?.toLowerCase()) {
      case 'severe':
        return 'interaction-severe';
      case 'moderate':
        return 'interaction-moderate';
      case 'mild':
        return 'interaction-mild';
      default:
        return 'interaction-mild';
    }
  };

  const getDecisionClass = (decision) => {
    switch(decision?.toLowerCase()) {
      case 'accepted':
        return 'decision-accepted';
      case 'modified':
        return 'decision-modified';
      case 'rejected':
        return 'decision-rejected';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="view-assessment-loading">
        <div className="loading-spinner"></div>
        <p>Loading assessment results...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="view-assessment-error">
        <i className="fas fa-exclamation-circle"></i>
        <h3>Assessment Not Found</h3>
        <p>The requested assessment could not be found.</p>
        <Link to={`/clinical/view-patient/${patientId}`} className="btn-primary">
          Back to Patient
        </Link>
      </div>
    );
  }

  return (
    <div className="view-assessment">
      <div className="page-header">
        <div>
          <h1>
            <i className="fas fa-stethoscope"></i>
            Assessment Results
          </h1>
          <p className="patient-info">
            Patient: <strong>{patient?.full_name || 'Loading...'}</strong>
          </p>
        </div>
        <div className="header-actions">
          {!assessment.is_completed && (
            <button onClick={() => setShowFinalizeModal(true)} className="btn-primary">
              <i className="fas fa-check-circle"></i>
              Finalize Assessment
            </button>
          )}
          <Link to={`/clinical/view-patient/${patientId}`} className="btn-outline">
            <i className="fas fa-arrow-left"></i>
            Back to Patient
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      <div className="assessment-card">
        <div className="assessment-header">
          <h3 className="section-title">
            <i className="fas fa-calendar-alt"></i>
            Assessment Details
          </h3>
          <span className="assessment-date">
            {formatDate(assessment.assessment_date, true)}
          </span>
        </div>

        <div className="vital-signs">
          <h4 className="subsection-title">
            <i className="fas fa-heartbeat"></i>
            Vital Signs
          </h4>
          <div className="info-grid">
            {assessment.systolic_bp && assessment.diastolic_bp && (
              <div className="info-item">
                <p className="info-label">Blood Pressure</p>
                <p className="info-value">
                  {assessment.systolic_bp}/{assessment.diastolic_bp} mmHg
                </p>
                <span className={`vital-badge vital-${getVitalStatus(
                  { systolic: assessment.systolic_bp, diastolic: assessment.diastolic_bp },
                  'bp'
                )}`}>
                  {getVitalStatus(
                    { systolic: assessment.systolic_bp, diastolic: assessment.diastolic_bp },
                    'bp'
                  ) === 'normal' ? 'Normal' :
                   getVitalStatus(
                    { systolic: assessment.systolic_bp, diastolic: assessment.diastolic_bp },
                    'bp'
                   ) === 'elevated' ? 'Elevated' : 'High'}
                </span>
              </div>
            )}
            
            {assessment.heart_rate && (
              <div className="info-item">
                <p className="info-label">Heart Rate</p>
                <p className="info-value">{assessment.heart_rate} bpm</p>
                <span className={`vital-badge vital-${getVitalStatus(assessment.heart_rate, 'heart_rate')}`}>
                  {getVitalStatus(assessment.heart_rate, 'heart_rate') === 'normal' ? 'Normal' :
                   getVitalStatus(assessment.heart_rate, 'heart_rate') === 'elevated' ? 'Bradycardia' : 'Tachycardia'}
                </span>
              </div>
            )}
            
            {assessment.temperature && (
              <div className="info-item">
                <p className="info-label">Temperature</p>
                <p className="info-value">{assessment.temperature} °C</p>
                <span className={`vital-badge vital-${getVitalStatus(assessment.temperature, 'temperature')}`}>
                  {getVitalStatus(assessment.temperature, 'temperature') === 'normal' ? 'Normal' :
                   getVitalStatus(assessment.temperature, 'temperature') === 'elevated' ? 'Mild Fever' : 'Fever'}
                </span>
              </div>
            )}
            
            {assessment.oxygen_saturation && (
              <div className="info-item">
                <p className="info-label">Oxygen Saturation</p>
                <p className="info-value">{assessment.oxygen_saturation}%</p>
                <span className={`vital-badge vital-${getVitalStatus(assessment.oxygen_saturation, 'oxygen')}`}>
                  {getVitalStatus(assessment.oxygen_saturation, 'oxygen') === 'normal' ? 'Normal' :
                   getVitalStatus(assessment.oxygen_saturation, 'oxygen') === 'elevated' ? 'Low' : 'Critical'}
                </span>
              </div>
            )}
          </div>
        </div>

        {assessment.bmi && (
          <div className="anthropometrics">
            <h4 className="subsection-title">
              <i className="fas fa-weight"></i>
              Anthropometrics
            </h4>
            <div className="info-grid">
              <div className="info-item">
                <p className="info-label">Weight</p>
                <p className="info-value">{assessment.weight_kg} kg</p>
              </div>
              <div className="info-item">
                <p className="info-label">Height</p>
                <p className="info-value">{assessment.height_cm} cm</p>
              </div>
              <div className="info-item">
                <p className="info-label">BMI</p>
                <p className="info-value">{assessment.bmi}</p>
              </div>
            </div>
          </div>
        )}

        {(assessment.fasting_glucose || assessment.hba1c || assessment.total_cholesterol) && (
          <div className="lab-results">
            <h4 className="subsection-title">
              <i className="fas fa-flask"></i>
              Laboratory Results
            </h4>
            <div className="info-grid">
              {assessment.fasting_glucose && (
                <div className="info-item">
                  <p className="info-label">Fasting Glucose</p>
                  <p className="info-value">{assessment.fasting_glucose} mg/dL</p>
                </div>
              )}
              {assessment.hba1c && (
                <div className="info-item">
                  <p className="info-label">HbA1c</p>
                  <p className="info-value">{assessment.hba1c}%</p>
                </div>
              )}
              {assessment.total_cholesterol && (
                <div className="info-item">
                  <p className="info-label">Total Cholesterol</p>
                  <p className="info-value">{assessment.total_cholesterol} mg/dL</p>
                </div>
              )}
              {assessment.ldl_cholesterol && (
                <div className="info-item">
                  <p className="info-label">LDL Cholesterol</p>
                  <p className="info-value">{assessment.ldl_cholesterol} mg/dL</p>
                </div>
              )}
              {assessment.hdl_cholesterol && (
                <div className="info-item">
                  <p className="info-label">HDL Cholesterol</p>
                  <p className="info-value">{assessment.hdl_cholesterol} mg/dL</p>
                </div>
              )}
              {assessment.triglycerides && (
                <div className="info-item">
                  <p className="info-label">Triglycerides</p>
                  <p className="info-value">{assessment.triglycerides} mg/dL</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="ai-recommendation">
          <h4 className="subsection-title">
            <i className="fas fa-brain"></i>
            AI Recommendation
          </h4>
          
          {assessment.ai_recommended_drug && (
            <div className="recommendation-box">
              <div className="drug-recommendation">
                <span className="drug-name">{assessment.ai_recommended_drug}</span>
                {assessment.ai_confidence && (
                  <div className="confidence">
                    <span>Confidence: {assessment.ai_confidence}%</span>
                    <div className="confidence-meter">
                      <div 
                        className="confidence-fill" 
                        style={{ width: `${assessment.ai_confidence}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {assessment.assessment_notes && (
            <div className="clinical-notes">
              <p className="info-label">Clinical Notes</p>
              <p className="notes-text">{assessment.assessment_notes}</p>
            </div>
          )}
        </div>

        {interactions && (
          <div className="drug-interactions">
            <h4 className="subsection-title">
              <i className="fas fa-exclamation-triangle"></i>
              Drug Interactions
            </h4>
            <div className={getInteractionClass(interactions.severity)}>
              <p className="interaction-title">
                {interactions.recommendation || 'No recommendation available'}
              </p>
              {interactions.warnings && interactions.warnings.length > 0 && (
                <ul className="interaction-warnings">
                  {interactions.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {assessment.is_completed && (
          <div className="clinician-decision">
            <h4 className="subsection-title">
              <i className="fas fa-user-md"></i>
              Clinician Decision
            </h4>
            <div className="decision-section">
              <span className={getDecisionClass(assessment.clinician_decision)}>
                {assessment.clinician_decision || 'Not specified'}
              </span>
              
              {assessment.clinician_selected_drug && (
                <div className="selected-drug">
                  <p className="info-label">Selected Drug</p>
                  <p className="drug-name">{assessment.clinician_selected_drug}</p>
                </div>
              )}
              
              {assessment.clinician_notes && (
                <div className="clinician-notes">
                  <p className="info-label">Clinician Notes</p>
                  <p className="notes-text">{assessment.clinician_notes}</p>
                </div>
              )}
              
              {assessment.follow_up_date && (
                <div className="follow-up">
                  <p className="info-label">Follow-up Date</p>
                  <p className="follow-up-date">{formatDate(assessment.follow_up_date)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showFinalizeModal && (
        <div className="modal" onClick={() => setShowFinalizeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>
              <i className="fas fa-check-circle"></i>
              Finalize Clinical Assessment
            </h3>

            <form onSubmit={handleFinalizeSubmit}>
              <div className="form-group">
                <label>Clinician Decision *</label>
                <select
                  name="clinician_decision"
                  value={finalizeForm.clinician_decision}
                  onChange={handleFinalizeChange}
                  required
                >
                  <option value="">Select Decision</option>
                  <option value="Accepted">Accept AI Recommendation</option>
                  <option value="Modified">Modify Recommendation</option>
                  <option value="Rejected">Reject AI Recommendation</option>
                </select>
              </div>

              <div className="form-group">
                <label>Selected Drug</label>
                <input
                  type="text"
                  name="clinician_selected_drug"
                  value={finalizeForm.clinician_selected_drug}
                  onChange={handleFinalizeChange}
                  placeholder="Enter drug name"
                />
              </div>

              <div className="form-group">
                <label>Follow-up Date</label>
                <input
                  type="date"
                  name="follow_up_date"
                  value={finalizeForm.follow_up_date}
                  onChange={handleFinalizeChange}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label>Clinical Notes</label>
                <textarea
                  name="clinician_notes"
                  value={finalizeForm.clinician_notes}
                  onChange={handleFinalizeChange}
                  rows="4"
                  placeholder="Add any clinical notes or observations..."
                ></textarea>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowFinalizeModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={finalizing}
                >
                  {finalizing ? 'Saving...' : 'Save & Finalize'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewAssessment;