import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { diseaseService } from '../../services/diseaseService';
import './PatientAssessment.css';

const PatientAssessment = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();

  // State for patient data
  const [patient, setPatient] = useState(null);
  
  // State for form data
  const [formData, setFormData] = useState({
    // Vital Signs
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    respiratory_rate: '',
    temperature: '',
    oxygen_saturation: '',
    
    // Anthropometrics
    weight_kg: '',
    height_cm: '',
    bmi: '',
    
    // Lab Results
    fasting_glucose: '',
    hba1c: '',
    total_cholesterol: '',
    ldl_cholesterol: '',
    hdl_cholesterol: '',
    triglycerides: '',
    creatinine: '',
    
    // Lifestyle
    smoker: 'no',
    alcohol_consumption: 'none',
    exercise_frequency: 'none',
    
    // Clinical Assessment
    chief_complaint: '',
    symptoms: '',  // This will be auto-populated from selected symptoms
    assessment_notes: '',
    diagnosis: ''
  });

  // State for selected vital sign cards
  const [selectedCards, setSelectedCards] = useState([]);
  
  // AI Recommendation states
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [recommendationAction, setRecommendationAction] = useState(null);
  const [modifiedRecommendation, setModifiedRecommendation] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [aiError, setAiError] = useState('');

  // Disease Predictor states
  const [showDiseasePredictor, setShowDiseasePredictor] = useState(false);
  const [availableSymptoms, setAvailableSymptoms] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState({});
  const [diseasePrediction, setDiseasePrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [applySuccessMessage, setApplySuccessMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchPatientData();
    fetchAvailableSymptoms();
  }, [patientId]);

  useEffect(() => {
    calculateBMI();
  }, [formData.weight_kg, formData.height_cm]);

  
  useEffect(() => {
    const selectedSymptomsList = Object.keys(selectedSymptoms)
      .filter(symptom => selectedSymptoms[symptom] === 1);
    
    if (selectedSymptomsList.length > 0) {
      const symptomsText = selectedSymptomsList
        .map(symptom => symptom.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
        .join(', ');
      setFormData(prev => ({ ...prev, symptoms: symptomsText }));
    } else if (!formData.symptoms || formData.symptoms === '') {
      
      setFormData(prev => ({ ...prev, symptoms: '' }));
    }
  }, [selectedSymptoms]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/clinical/patients/${patientId}`);
      setPatient(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load patient data. Please try again.');
      console.error('Error fetching patient:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSymptoms = async () => {
    try {
      const response = await diseaseService.getSymptoms();
      if (response.success) {
        setAvailableSymptoms(response.symptoms);
        const initialSymptoms = {};
        response.symptoms.forEach(symptom => {
          initialSymptoms[symptom] = 0;
        });
        setSelectedSymptoms(initialSymptoms);
      }
    } catch (err) {
      console.error('Error fetching symptoms:', err);
      setPredictionError('Failed to load symptoms');
    }
  };

  const calculateBMI = () => {
    const weight = parseFloat(formData.weight_kg);
    const height = parseFloat(formData.height_cm);
    
    if (weight && height && weight > 0 && height > 0) {
      const heightM = height / 100;
      const bmi = (weight / (heightM * heightM)).toFixed(1);
      setFormData(prev => ({ ...prev, bmi }));
    } else {
      setFormData(prev => ({ ...prev, bmi: '' }));
    }
  };

  const fetchAIRecommendation = async () => {
    if (!formData.systolic_bp || !formData.diastolic_bp) {
      setAiError('Please enter blood pressure values to get AI recommendation');
      return;
    }
    
    if (!formData.fasting_glucose) {
      setAiError('Please enter fasting glucose value to get AI recommendation');
      return;
    }
    
    if (!formData.weight_kg || !formData.height_cm) {
      setAiError('Please enter weight and height to get AI recommendation');
      return;
    }
    
    setLoadingAI(true);
    setAiError('');
    setError('');
    
    try {
      const aiData = {
        patient_id: parseInt(patientId),
        systolic_bp: parseFloat(formData.systolic_bp),
        diastolic_bp: parseFloat(formData.diastolic_bp),
        heart_rate: formData.heart_rate ? parseFloat(formData.heart_rate) : null,
        fasting_glucose: parseFloat(formData.fasting_glucose),
        hba1c: formData.hba1c ? parseFloat(formData.hba1c) : null,
        bmi: formData.bmi ? parseFloat(formData.bmi) : null,
        total_cholesterol: formData.total_cholesterol ? parseFloat(formData.total_cholesterol) : null,
        ldl_cholesterol: formData.ldl_cholesterol ? parseFloat(formData.ldl_cholesterol) : null,
        hdl_cholesterol: formData.hdl_cholesterol ? parseFloat(formData.hdl_cholesterol) : null,
        triglycerides: formData.triglycerides ? parseFloat(formData.triglycerides) : null,
        smoker: formData.smoker,
        alcohol_consumption: formData.alcohol_consumption,
        exercise_frequency: formData.exercise_frequency,
        symptoms: formData.symptoms,  // Now this contains the selected symptoms
        age: patient?.age || 0
      };
      
      console.log('Sending symptoms to AI:', formData.symptoms);
      
      const response = await api.post('/clinical/ai-recommendation', aiData);
      setAiRecommendation(response.data);
      setModifiedRecommendation(response.data.recommended_drug);
      setShowRecommendation(true);
      setRecommendationAction(null);
      setAiError('');
      
    } catch (err) {
      console.error('Error fetching AI recommendation:', err);
      setAiError(err.response?.data?.message || 'Failed to get AI recommendation. Please try again.');
    } finally {
      setLoadingAI(false);
    }
  };

  // Disease Predictor functions
  const handleSymptomToggle = (symptom) => {
    setSelectedSymptoms(prev => ({
      ...prev,
      [symptom]: prev[symptom] === 1 ? 0 : 1
    }));
    setDiseasePrediction(null);
    setPredictionError('');
    setApplySuccessMessage('');
  };

  const handlePredictDisease = async () => {
    const selectedCount = Object.values(selectedSymptoms).filter(v => v === 1).length;
    if (selectedCount === 0) {
      setPredictionError('Please select at least one symptom');
      return;
    }

    setPredicting(true);
    setPredictionError('');
    setApplySuccessMessage('');
    
    try {
      const symptomsToSend = {};
      Object.keys(selectedSymptoms).forEach(symptom => {
        if (selectedSymptoms[symptom] === 1) {
          symptomsToSend[symptom] = 1;
        }
      });
      
      const response = await diseaseService.predict(symptomsToSend);
      if (response.success) {
        setDiseasePrediction(response.prediction);
      } else {
        setPredictionError(response.error || 'Prediction failed');
      }
    } catch (err) {
      console.error('Error predicting disease:', err);
      setPredictionError(err.error || 'Failed to get prediction');
    } finally {
      setPredicting(false);
    }
  };

  // Apply to Assessment
  const handleApplyPrediction = () => {
    if (diseasePrediction) {
      setApplySuccessMessage(`✓ Prediction noted: ${diseasePrediction.predicted_disease} (${diseasePrediction.confidence_percentage} confidence). The symptoms have been added to the Symptoms field.`);
      
      setTimeout(() => {
        setShowDiseasePredictor(false);
        setApplySuccessMessage('');
      }, 3000);
    }
  };

  const getFilteredSymptoms = () => {
    if (!searchTerm) return availableSymptoms;
    return availableSymptoms.filter(symptom => 
      symptom.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    if (showRecommendation) {
      setShowRecommendation(false);
      setAiRecommendation(null);
      setAiError('');
    }
    
    if (type === 'number') {
      if (value === '' || !isNaN(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const toggleCardSelection = (cardId) => {
    setSelectedCards(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      } else {
        return [...prev, cardId];
      }
    });
  };

  const acceptRecommendation = () => {
    setRecommendationAction('accept');
    setFormData(prev => ({ 
      ...prev, 
      diagnosis: aiRecommendation.recommended_drug,
      assessment_notes: prev.assessment_notes 
        ? `${prev.assessment_notes}\n\nAI Recommendation: ${aiRecommendation.recommended_drug} - ${aiRecommendation.reasoning}`
        : `AI Recommendation: ${aiRecommendation.recommended_drug} - ${aiRecommendation.reasoning}`
    }));
  };

  const modifyRecommendation = () => {
    setRecommendationAction('modify');
  };

  const saveModifiedRecommendation = () => {
    if (!modifiedRecommendation.trim()) {
      setAiError('Please enter a modified recommendation');
      return;
    }
    setRecommendationAction(null);
    setFormData(prev => ({ 
      ...prev, 
      diagnosis: modifiedRecommendation,
      assessment_notes: prev.assessment_notes 
        ? `${prev.assessment_notes}\n\nModified AI Recommendation: ${modifiedRecommendation}`
        : `Modified AI Recommendation: ${modifiedRecommendation}`
    }));
    setAiError('');
  };

  const rejectRecommendation = () => {
    setRecommendationAction('reject');
  };

  const confirmRejection = () => {
    if (!rejectionReason.trim()) {
      setAiError('Please provide a reason for rejection');
      return;
    }
    setRecommendationAction(null);
    setFormData(prev => ({ 
      ...prev, 
      assessment_notes: prev.assessment_notes 
        ? `${prev.assessment_notes}\n\nAI Recommendation Rejected: ${rejectionReason}`
        : `AI Recommendation Rejected: ${rejectionReason}`
    }));
    setRejectionReason('');
    setAiError('');
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.weight_kg) errors.weight_kg = 'Weight is required';
    if (!formData.height_cm) errors.height_cm = 'Height is required';
    if (!formData.systolic_bp && !formData.diastolic_bp && !formData.heart_rate) {
      errors.vital_signs = 'At least one vital sign is required';
    }

    if (formData.systolic_bp && (formData.systolic_bp < 60 || formData.systolic_bp > 250)) {
      errors.systolic_bp = 'Systolic BP must be between 60-250 mmHg';
    }
    if (formData.diastolic_bp && (formData.diastolic_bp < 40 || formData.diastolic_bp > 150)) {
      errors.diastolic_bp = 'Diastolic BP must be between 40-150 mmHg';
    }
    if (formData.heart_rate && (formData.heart_rate < 30 || formData.heart_rate > 250)) {
      errors.heart_rate = 'Heart rate must be between 30-250 bpm';
    }
    if (formData.temperature && (formData.temperature < 30 || formData.temperature > 45)) {
      errors.temperature = 'Temperature must be between 30-45°C';
    }
    if (formData.oxygen_saturation && (formData.oxygen_saturation < 50 || formData.oxygen_saturation > 100)) {
      errors.oxygen_saturation = 'Oxygen saturation must be between 50-100%';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      const firstError = document.querySelector('.error-message');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const userStr = localStorage.getItem('user');
      
      if (!userStr) {
        setError('User not authenticated. Please log in again.');
        setSubmitting(false);
        return;
      }

      const user = JSON.parse(userStr);
      
      const assessmentData = {
        ...formData,
        assessed_by: parseInt(user.id),
        patient_id: parseInt(patientId),
        ai_recommended_drug: aiRecommendation?.recommended_drug,
        ai_confidence: aiRecommendation?.confidence,
        clinician_decision: recommendationAction === 'accept' ? 'accepted' : (recommendationAction === 'modify' ? 'modified' : (recommendationAction === 'reject' ? 'rejected' : null)),
        clinician_selected_drug: recommendationAction === 'modify' ? modifiedRecommendation : (recommendationAction === 'accept' ? aiRecommendation?.recommended_drug : null),
        clinician_notes: recommendationAction === 'reject' ? rejectionReason : null
      };

      console.log('Submitting assessment:', assessmentData);

      const response = await api.post(`/clinical/patients/${patientId}/assessments`, assessmentData);
      
      navigate(`/clinical/view-assessment/${patientId}/${response.data.assessment_id}`, {
        state: { 
          success: 'Assessment completed successfully!',
          recommendation: aiRecommendation 
        }
      });
    } catch (err) {
      console.error('Submission error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to submit assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getBMICategory = (bmi) => {
    if (!bmi) return '';
    const bmiNum = parseFloat(bmi);
    if (bmiNum < 18.5) return 'Underweight';
    if (bmiNum < 25) return 'Normal';
    if (bmiNum < 30) return 'Overweight';
    return 'Obese';
  };

  if (loading) {
    return (
      <div className="assessment-loading">
        <div className="loading-spinner"></div>
        <p>Loading patient information...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="assessment-error">
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
    <div className="patient-assessment">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>
            <i className="fas fa-stethoscope"></i>
            Patient Assessment
          </h1>
          <p className="patient-info">
            Patient: <strong>{patient.full_name || `${patient.first_name} ${patient.last_name}`}</strong> 
            ({patient.patient_id || patient.id}) | Age: {patient.age} years
          </p>
        </div>
        <Link to={`/clinical/view-patient/${patientId}`} className="btn-outline">
          <i className="fas fa-arrow-left"></i>
          Back to Patient
        </Link>
      </div>

      {error && (
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      {/* Success Message for Apply to Assessment */}
      {applySuccessMessage && (
        <div className="alert alert-success" style={{ backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' }}>
          <i className="fas fa-check-circle"></i>
          {applySuccessMessage}
        </div>
      )}

      {/* AI Recommendation Section */}
      <div className="assessment-section">
        <div className="section-header">
          <div className="section-header-left">
            <i className="fas fa-brain"></i>
            <h2>AI Clinical Assistant</h2>
          </div>
          <div className="section-header-right">
            <button 
              type="button" 
              className="btn-ai-recommendation"
              onClick={fetchAIRecommendation}
              disabled={loadingAI}
            >
              <i className="fas fa-robot"></i>
              {loadingAI ? 'Generating...' : 'Get AI Recommendation'}
            </button>
          </div>
        </div>
        <p className="section-description">Get AI-powered drug recommendations based on vitals and lab results</p>
        {aiError && <div className="ai-error">{aiError}</div>}
      </div>

      {/* AI Recommendation Display */}
      {showRecommendation && aiRecommendation && (
        <div className="ai-recommendation-card">
          <div className="ai-recommendation-header">
            <i className="fas fa-robot"></i>
            <h3>AI Clinical Recommendation</h3>
          </div>
          
          <div className="ai-recommendation-content">
            <div className="recommendation-drug">
              <strong>Recommended Drug:</strong>
              <span className="drug-name">{aiRecommendation.recommended_drug}</span>
            </div>
            <div className="recommendation-dosage">
              <strong>Dosage:</strong>
              <span>{aiRecommendation.dosage || 'Standard dosage'}</span>
            </div>
            <div className="recommendation-reasoning">
              <strong>Clinical Reasoning:</strong>
              <p>{aiRecommendation.reasoning}</p>
            </div>
            <div className="recommendation-confidence">
              <strong>Confidence Score:</strong>
              <div className="confidence-bar">
                <div className="confidence-fill" style={{ width: `${aiRecommendation.confidence}%` }}></div>
              </div>
              <span className="confidence-value">{aiRecommendation.confidence}%</span>
            </div>
            {aiRecommendation.clinical_indicators && (
              <div className="clinical-indicators">
                <strong>Clinical Indicators:</strong>
                <div className="indicators-list">
                  {Object.entries(aiRecommendation.clinical_indicators).map(([key, value]) => (
                    value && <span key={key} className="indicator-badge">{key.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="ai-recommendation-actions">
            {!recommendationAction && (
              <>
                <button className="btn-accept" onClick={acceptRecommendation}>
                  <i className="fas fa-check-circle"></i> Accept
                </button>
                <button className="btn-modify" onClick={modifyRecommendation}>
                  <i className="fas fa-edit"></i> Modify
                </button>
                <button className="btn-reject" onClick={rejectRecommendation}>
                  <i className="fas fa-times-circle"></i> Reject
                </button>
              </>
            )}
            
            {recommendationAction === 'modify' && (
              <div className="modify-section">
                <label>Modified Recommendation:</label>
                <input
                  type="text"
                  value={modifiedRecommendation}
                  onChange={(e) => setModifiedRecommendation(e.target.value)}
                  placeholder="Enter modified drug recommendation"
                  autoFocus
                />
                <div className="modify-actions">
                  <button className="btn-save" onClick={saveModifiedRecommendation}>
                    <i className="fas fa-save"></i> Save Modified
                  </button>
                  <button className="btn-cancel" onClick={() => setRecommendationAction(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {recommendationAction === 'reject' && (
              <div className="reject-section">
                <label>Reason for Rejection:</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide reason for rejecting AI recommendation..."
                  rows="2"
                  autoFocus
                />
                <div className="reject-actions">
                  <button className="btn-confirm" onClick={confirmRejection}>
                    Confirm Rejection
                  </button>
                  <button className="btn-cancel" onClick={() => setRecommendationAction(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disease Predictor Section */}
      <div className="assessment-section">
        <div className="section-header">
          <div className="section-header-left">
            <i className="fas fa-stethoscope"></i>
            <h2>Symptom-Based Disease Predictor</h2>
          </div>
          <div className="section-header-right">
            <button 
              type="button" 
              className={`btn-toggle-predictor ${showDiseasePredictor ? 'active' : ''}`}
              onClick={() => setShowDiseasePredictor(!showDiseasePredictor)}
            >
              <i className={`fas ${showDiseasePredictor ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
              {showDiseasePredictor ? 'Hide Predictor' : 'Show Predictor'}
            </button>
          </div>
        </div>
        <p className="section-description">Select patient symptoms to get AI-powered disease predictions</p>
        
        {showDiseasePredictor && (
          <div className="disease-predictor-card">
            <div className="symptom-search">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="Search symptoms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="symptom-search-input"
              />
            </div>
            
            <div className="symptoms-grid">
              {getFilteredSymptoms().slice(0, 50).map(symptom => (
                <div key={symptom} className="symptom-item">
                  <label className="symptom-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedSymptoms[symptom] === 1}
                      onChange={() => handleSymptomToggle(symptom)}
                    />
                    <span className="symptom-name">
                      {symptom.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </label>
                </div>
              ))}
            </div>
            
            {availableSymptoms.length > 50 && (
              <div className="symptom-count-info">
                Showing 50 of {availableSymptoms.length} symptoms. Use search to find more.
              </div>
            )}
            
            <div className="predict-actions">
              <button 
                className="btn-predict"
                onClick={handlePredictDisease}
                disabled={predicting}
              >
                <i className="fas fa-chart-line"></i>
                {predicting ? 'Analyzing...' : 'Predict Disease'}
              </button>
            </div>
            
            {predictionError && (
              <div className="prediction-error">
                <i className="fas fa-exclamation-circle"></i>
                {predictionError}
              </div>
            )}
            
            {diseasePrediction && (
              <div className="prediction-results">
                <div className="prediction-header">
                  <h4>Prediction Results</h4>
                  <button className="btn-apply" onClick={handleApplyPrediction}>
                    <i className="fas fa-check-circle"></i> Apply to Assessment
                  </button>
                </div>
                
                <div className="main-prediction">
                  <div className="predicted-disease">
                    <strong>Predicted Disease:</strong>
                    <span className="disease-name">{diseasePrediction.predicted_disease}</span>
                  </div>
                  <div className="confidence-score">
                    <strong>Confidence:</strong>
                    <div className="confidence-bar">
                      <div 
                        className="confidence-fill" 
                        style={{ width: diseasePrediction.confidence_percentage }}
                      ></div>
                    </div>
                    <span className="confidence-value">{diseasePrediction.confidence_percentage}</span>
                  </div>
                  <div className="symptoms-used">
                    <strong>Symptoms Used:</strong>
                    <span>{diseasePrediction.symptoms_used} / {diseasePrediction.total_symptoms_considered}</span>
                  </div>
                </div>
                
                <div className="top-predictions">
                  <h5>Top 3 Possible Diseases:</h5>
                  {diseasePrediction.top_predictions.map((pred, index) => (
                    <div key={index} className="prediction-item">
                      <div className="prediction-disease">{pred.disease}</div>
                      <div className="prediction-confidence-bar">
                        <div 
                          className="prediction-confidence-fill" 
                          style={{ width: pred.confidence_percentage }}
                        ></div>
                      </div>
                      <div className="prediction-percentage">{pred.confidence_percentage}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clinical Assessment Form */}
      <div className="form-card">
        <div className="form-header">
          <i className="fas fa-heartbeat"></i>
          <div>
            <h3>Clinical Assessment Form</h3>
            <p className="form-subtitle">Enter patient vital signs and clinical information</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Vital Signs */}
          <div className="form-section">
            <h4 className="subsection-title">
              <i className="fas fa-heartbeat"></i>
              Vital Signs
            </h4>
            
            <div className="vital-signs-grid">
              <div 
                className={`vital-sign-card ${selectedCards.includes('bp') ? 'selected' : ''}`}
                onClick={() => toggleCardSelection('bp')}
              >
                <div className="vital-sign-icon"><i className="fas fa-heart"></i></div>
                <div className="vital-sign-content">
                  <div className="vital-sign-label">Blood Pressure</div>
                  <div className="vital-sign-inputs">
                    <input
                      type="number"
                      name="systolic_bp"
                      value={formData.systolic_bp}
                      onChange={handleChange}
                      placeholder="120"
                      onClick={(e) => e.stopPropagation()}
                      className={validationErrors.systolic_bp ? 'error' : ''}
                    />
                    <span className="separator">/</span>
                    <input
                      type="number"
                      name="diastolic_bp"
                      value={formData.diastolic_bp}
                      onChange={handleChange}
                      placeholder="80"
                      onClick={(e) => e.stopPropagation()}
                      className={validationErrors.diastolic_bp ? 'error' : ''}
                    />
                  </div>
                  <span className="vital-sign-unit">mmHg</span>
                </div>
                {validationErrors.systolic_bp && (
                  <div className="error-message">{validationErrors.systolic_bp}</div>
                )}
                {validationErrors.diastolic_bp && (
                  <div className="error-message">{validationErrors.diastolic_bp}</div>
                )}
              </div>

              <div 
                className={`vital-sign-card ${selectedCards.includes('hr') ? 'selected' : ''}`}
                onClick={() => toggleCardSelection('hr')}
              >
                <div className="vital-sign-icon"><i className="fas fa-heart"></i></div>
                <div className="vital-sign-content">
                  <div className="vital-sign-label">Heart Rate</div>
                  <div className="vital-sign-inputs">
                    <input
                      type="number"
                      name="heart_rate"
                      value={formData.heart_rate}
                      onChange={handleChange}
                      placeholder="72"
                      onClick={(e) => e.stopPropagation()}
                      className={validationErrors.heart_rate ? 'error' : ''}
                    />
                  </div>
                  <span className="vital-sign-unit">bpm</span>
                </div>
                {validationErrors.heart_rate && (
                  <div className="error-message">{validationErrors.heart_rate}</div>
                )}
              </div>

              <div 
                className={`vital-sign-card ${selectedCards.includes('rr') ? 'selected' : ''}`}
                onClick={() => toggleCardSelection('rr')}
              >
                <div className="vital-sign-icon"><i className="fas fa-lungs"></i></div>
                <div className="vital-sign-content">
                  <div className="vital-sign-label">Respiratory Rate</div>
                  <div className="vital-sign-inputs">
                    <input
                      type="number"
                      name="respiratory_rate"
                      value={formData.respiratory_rate}
                      onChange={handleChange}
                      placeholder="16"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <span className="vital-sign-unit">breaths/min</span>
                </div>
              </div>

              <div 
                className={`vital-sign-card ${selectedCards.includes('temp') ? 'selected' : ''}`}
                onClick={() => toggleCardSelection('temp')}
              >
                <div className="vital-sign-icon"><i className="fas fa-thermometer-half"></i></div>
                <div className="vital-sign-content">
                  <div className="vital-sign-label">Temperature</div>
                  <div className="vital-sign-inputs">
                    <input
                      type="number"
                      name="temperature"
                      value={formData.temperature}
                      onChange={handleChange}
                      placeholder="36.6"
                      step="0.1"
                      onClick={(e) => e.stopPropagation()}
                      className={validationErrors.temperature ? 'error' : ''}
                    />
                  </div>
                  <span className="vital-sign-unit">°C</span>
                </div>
                {validationErrors.temperature && (
                  <div className="error-message">{validationErrors.temperature}</div>
                )}
              </div>

              <div 
                className={`vital-sign-card ${selectedCards.includes('o2') ? 'selected' : ''}`}
                onClick={() => toggleCardSelection('o2')}
              >
                <div className="vital-sign-icon"><i className="fas fa-lungs"></i></div>
                <div className="vital-sign-content">
                  <div className="vital-sign-label">Oxygen Saturation</div>
                  <div className="vital-sign-inputs">
                    <input
                      type="number"
                      name="oxygen_saturation"
                      value={formData.oxygen_saturation}
                      onChange={handleChange}
                      placeholder="98"
                      onClick={(e) => e.stopPropagation()}
                      className={validationErrors.oxygen_saturation ? 'error' : ''}
                    />
                  </div>
                  <span className="vital-sign-unit">%</span>
                </div>
                {validationErrors.oxygen_saturation && (
                  <div className="error-message">{validationErrors.oxygen_saturation}</div>
                )}
              </div>
            </div>
            {validationErrors.vital_signs && (
              <div className="error-message">{validationErrors.vital_signs}</div>
            )}
          </div>

          {/* Anthropometrics */}
          <div className="form-section">
            <h4 className="subsection-title">
              <i className="fas fa-weight"></i>
              Anthropometrics
            </h4>
            
            <div className="anthropometrics-grid">
              <div className="form-group">
                <label>Weight (kg) *</label>
                <input
                  type="number"
                  name="weight_kg"
                  value={formData.weight_kg}
                  onChange={handleChange}
                  step="0.1"
                  placeholder="70.5"
                  className={validationErrors.weight_kg ? 'error' : ''}
                  required
                />
                {validationErrors.weight_kg && (
                  <div className="error-message">{validationErrors.weight_kg}</div>
                )}
              </div>
              
              <div className="form-group">
                <label>Height (cm) *</label>
                <input
                  type="number"
                  name="height_cm"
                  value={formData.height_cm}
                  onChange={handleChange}
                  step="0.1"
                  placeholder="175"
                  className={validationErrors.height_cm ? 'error' : ''}
                  required
                />
                {validationErrors.height_cm && (
                  <div className="error-message">{validationErrors.height_cm}</div>
                )}
              </div>
              
              <div className="form-group">
                <label>BMI (Auto-calculated)</label>
                <input
                  type="text"
                  value={formData.bmi ? `${formData.bmi} (${getBMICategory(formData.bmi)})` : '—'}
                  readOnly
                  className="bmi-display"
                />
                <input type="hidden" name="bmi" value={formData.bmi} />
              </div>
            </div>
          </div>

          {/* Lab Results */}
          <div className="form-section">
            <h4 className="subsection-title">
              <i className="fas fa-flask"></i>
              Laboratory Results
            </h4>
            
            <div className="lab-grid">
              <div className="form-group">
                <label>Fasting Glucose (mg/dL)</label>
                <input
                  type="number"
                  name="fasting_glucose"
                  value={formData.fasting_glucose}
                  onChange={handleChange}
                  step="1"
                  placeholder="mg/dL"
                />
              </div>
              
              <div className="form-group">
                <label>HbA1c (%)</label>
                <input
                  type="number"
                  name="hba1c"
                  value={formData.hba1c}
                  onChange={handleChange}
                  step="0.1"
                  placeholder="%"
                />
              </div>
              
              <div className="form-group">
                <label>Total Cholesterol (mg/dL)</label>
                <input
                  type="number"
                  name="total_cholesterol"
                  value={formData.total_cholesterol}
                  onChange={handleChange}
                  step="1"
                  placeholder="mg/dL"
                />
              </div>
              
              <div className="form-group">
                <label>LDL Cholesterol (mg/dL)</label>
                <input
                  type="number"
                  name="ldl_cholesterol"
                  value={formData.ldl_cholesterol}
                  onChange={handleChange}
                  step="1"
                  placeholder="mg/dL"
                />
              </div>
              
              <div className="form-group">
                <label>HDL Cholesterol (mg/dL)</label>
                <input
                  type="number"
                  name="hdl_cholesterol"
                  value={formData.hdl_cholesterol}
                  onChange={handleChange}
                  step="1"
                  placeholder="mg/dL"
                />
              </div>
              
              <div className="form-group">
                <label>Triglycerides (mg/dL)</label>
                <input
                  type="number"
                  name="triglycerides"
                  value={formData.triglycerides}
                  onChange={handleChange}
                  step="1"
                  placeholder="mg/dL"
                />
              </div>
              
              <div className="form-group">
                <label>Creatinine (mg/dL)</label>
                <input
                  type="number"
                  name="creatinine"
                  value={formData.creatinine}
                  onChange={handleChange}
                  step="0.1"
                  placeholder="mg/dL"
                />
              </div>
            </div>
          </div>

          {/* Lifestyle Factors */}
          <div className="form-section">
            <h4 className="subsection-title">
              <i className="fas fa-heart"></i>
              Lifestyle Factors
            </h4>
            
            <div className="lifestyle-grid">
              <div className="form-group">
                <label>Smoker</label>
                <select name="smoker" value={formData.smoker} onChange={handleChange}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                  <option value="former">Former</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Alcohol Consumption</label>
                <select name="alcohol_consumption" value={formData.alcohol_consumption} onChange={handleChange}>
                  <option value="none">None</option>
                  <option value="occasional">Occasional</option>
                  <option value="moderate">Moderate</option>
                  <option value="heavy">Heavy</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Exercise Frequency</label>
                <select name="exercise_frequency" value={formData.exercise_frequency} onChange={handleChange}>
                  <option value="none">None</option>
                  <option value="1-2x/week">1-2 times/week</option>
                  <option value="3-4x/week">3-4 times/week</option>
                  <option value="5+x/week">5+ times/week</option>
                </select>
              </div>
            </div>
          </div>

          {/* Clinical Assessment */}
          <div className="form-section">
            <h4 className="subsection-title">
              <i className="fas fa-notes-medical"></i>
              Clinical Assessment
            </h4>
            
            <div className="clinical-grid">
              <div className="form-group full-width">
                <label>Chief Complaint</label>
                <input
                  type="text"
                  name="chief_complaint"
                  value={formData.chief_complaint}
                  onChange={handleChange}
                  placeholder="Patient's main reason for visit"
                />
              </div>
              
              <div className="form-group full-width">
                <label>Symptoms</label>
                <textarea
                  name="symptoms"
                  value={formData.symptoms}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Symptoms will be auto-populated from selected symptoms above..."
                  readOnly
                  style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                ></textarea>
                <small className="text-muted"></small>
              </div>
              
              <div className="form-group full-width">
                <label>Assessment Notes</label>
                <textarea
                  name="assessment_notes"
                  value={formData.assessment_notes}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Clinical observations and notes..."
                ></textarea>
              </div>
              
              <div className="form-group full-width">
                <label>Diagnosis</label>
                <input
                  type="text"
                  name="diagnosis"
                  value={formData.diagnosis}
                  onChange={handleChange}
                  placeholder="Preliminary diagnosis"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <Link to={`/clinical/view-patient/${patientId}`} className="btn-outline">
              <i className="fas fa-times"></i>
              Cancel
            </Link>
            <button type="submit" className="btn-primary" disabled={submitting}>
              <i className="fas fa-save"></i>
              {submitting ? 'Saving...' : 'Complete Assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientAssessment;