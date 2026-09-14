import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import './EditPatient.css';

const EditPatient = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    marital_status: '',
    occupation: '',
    phone_number: '',
    alternate_phone: '',
    email: '',
    national_id: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    blood_type: '',
    allergies: '',
    chronic_conditions: '',
    current_medications: '',
    insurance_provider: '',
    insurance_number: '',
    is_active: true
  });
  
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/clinical/patients/${patientId}`);
      const patientData = response.data;
      
      setPatient(patientData);
      
      const formattedDate = patientData.date_of_birth 
        ? new Date(patientData.date_of_birth).toISOString().split('T')[0] 
        : '';
      
      setFormData({
        first_name: patientData.first_name || '',
        last_name: patientData.last_name || '',
        date_of_birth: formattedDate,
        gender: patientData.gender || '',
        marital_status: patientData.marital_status || '',
        occupation: patientData.occupation || '',
        phone_number: patientData.phone_number || '',
        alternate_phone: patientData.alternate_phone || '',
        email: patientData.email || '',
        national_id: patientData.national_id || '',
        address_line1: patientData.address_line1 || '',
        address_line2: patientData.address_line2 || '',
        city: patientData.city || '',
        state: patientData.state || '',
        postal_code: patientData.postal_code || '',
        country: patientData.country || 'Kenya',
        emergency_contact_name: patientData.emergency_contact_name || '',
        emergency_contact_phone: patientData.emergency_contact_phone || '',
        emergency_contact_relation: patientData.emergency_contact_relation || '',
        blood_type: patientData.blood_type || '',
        allergies: patientData.allergies || '',
        chronic_conditions: patientData.chronic_conditions || '',
        current_medications: patientData.current_medications || '',
        insurance_provider: patientData.insurance_provider || '',
        insurance_number: patientData.insurance_number || '',
        is_active: patientData.is_active !== false
      });
      
      setSubmitError('');
    } catch (err) {
      setSubmitError('Failed to load patient data. Please try again.');
      console.error('Error fetching patient:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    validateField(name, formData[name]);
  };

  const validateField = (name, value) => {
    let error = '';
    
    switch(name) {
      case 'first_name':
      case 'last_name':
        if (!value.trim()) error = 'This field is required';
        break;
      case 'date_of_birth':
        if (!value) {
          error = 'Date of birth is required';
        } else {
          const age = calculateAge(new Date(value));
          if (age < 0) error = 'Date of birth cannot be in the future';
          if (age > 120) error = 'Please enter a valid date of birth';
        }
        break;
      case 'gender':
        if (!value) error = 'Please select a gender';
        break;
      case 'phone_number':
        if (!value) {
          error = 'Phone number is required';
        } else if (!/^[0-9+\-\s]{10,15}$/.test(value)) {
          error = 'Please enter a valid phone number';
        }
        break;
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;
      case 'address_line1':
      case 'city':
        if (!value.trim()) error = 'This field is required';
        break;
      default:
        break;
    }
    
    setErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  const calculateAge = (dob) => {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const getMaxDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const validateForm = () => {
    const requiredFields = [
      'first_name', 'last_name', 'date_of_birth', 'gender',
      'phone_number', 'address_line1', 'city'
    ];
    
    let isValid = true;
    const newErrors = {};
    
    requiredFields.forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });
    
    if (formData.email) {
      const emailError = validateField('email', formData.email);
      if (emailError) {
        newErrors.email = emailError;
        isValid = false;
      }
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const allTouched = {};
    Object.keys(formData).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);
    
    if (!validateForm()) {
      const firstError = document.querySelector('.error-message');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      await api.put(`/clinical/patients/${patientId}`, formData);
      
      setSubmitSuccess('Patient information updated successfully!');
      
      setTimeout(() => {
        navigate(`/clinical/view-patient/${patientId}`);
      }, 2000);
      
    } catch (err) {
      setSubmitError(
        err.response?.data?.message || 
        'Failed to update patient. Please check all fields and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const genderOptions = [
    { value: '', label: 'Select Gender' },
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' }
  ];

  const maritalOptions = [
    { value: '', label: 'Select Status' },
    { value: 'Single', label: 'Single' },
    { value: 'Married', label: 'Married' },
    { value: 'Divorced', label: 'Divorced' },
    { value: 'Widowed', label: 'Widowed' }
  ];

  const bloodTypeOptions = [
    { value: '', label: 'Select Blood Type' },
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' }
  ];

  if (loading) {
    return (
      <div className="edit-patient-loading">
        <div className="loading-spinner"></div>
        <p>Loading patient data...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="edit-patient-error">
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
    <div className="edit-patient">
      <div className="page-header">
        <h1>
          <i className="fas fa-edit"></i>
          Edit Patient Information
        </h1>
        <p className="patient-info">
          Editing record for: <strong>{patient?.full_name || `${patient?.first_name} ${patient?.last_name}`}</strong> 
          ({patient?.patient_id || patient?.id})
        </p>
      </div>

      {submitSuccess && (
        <div className="alert alert-success">
          <i className="fas fa-check-circle"></i>
          {submitSuccess}
        </div>
      )}

      {submitError && (
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle"></i>
          {submitError}
        </div>
      )}

      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="section-title">
              <i className="fas fa-user"></i>
              Personal Information
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={touched.first_name && errors.first_name ? 'error' : ''}
                  disabled={submitting}
                />
                {touched.first_name && errors.first_name && (
                  <div className="error-message">{errors.first_name}</div>
                )}
              </div>
              
              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={touched.last_name && errors.last_name ? 'error' : ''}
                  disabled={submitting}
                />
                {touched.last_name && errors.last_name && (
                  <div className="error-message">{errors.last_name}</div>
                )}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth *</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  max={getMaxDate()}
                  className={touched.date_of_birth && errors.date_of_birth ? 'error' : ''}
                  disabled={submitting}
                />
                {touched.date_of_birth && errors.date_of_birth && (
                  <div className="error-message">{errors.date_of_birth}</div>
                )}
              </div>
              
              <div className="form-group">
                <label>Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={touched.gender && errors.gender ? 'error' : ''}
                  disabled={submitting}
                >
                  {genderOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {touched.gender && errors.gender && (
                  <div className="error-message">{errors.gender}</div>
                )}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Marital Status</label>
                <select
                  name="marital_status"
                  value={formData.marital_status}
                  onChange={handleChange}
                  disabled={submitting}
                >
                  {maritalOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Occupation</label>
                <input
                  type="text"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleChange}
                  placeholder="e.g., Teacher, Engineer"
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">
              <i className="fas fa-address-book"></i>
              Contact Information
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={touched.phone_number && errors.phone_number ? 'error' : ''}
                  placeholder="e.g., 0712345678"
                  disabled={submitting}
                />
                {touched.phone_number && errors.phone_number && (
                  <div className="error-message">{errors.phone_number}</div>
                )}
              </div>
              
              <div className="form-group">
                <label>Alternate Phone</label>
                <input
                  type="tel"
                  name="alternate_phone"
                  value={formData.alternate_phone}
                  onChange={handleChange}
                  placeholder="e.g., 0723456789"
                  disabled={submitting}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={touched.email && errors.email ? 'error' : ''}
                  placeholder="patient@example.com"
                  disabled={submitting}
                />
                {touched.email && errors.email && (
                  <div className="error-message">{errors.email}</div>
                )}
              </div>
              
              <div className="form-group">
                <label>National ID</label>
                <input
                  type="text"
                  name="national_id"
                  value={formData.national_id}
                  onChange={handleChange}
                  placeholder="ID Card Number"
                  disabled={submitting}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Address Line 1 *</label>
              <input
                type="text"
                name="address_line1"
                value={formData.address_line1}
                onChange={handleChange}
                onBlur={handleBlur}
                className={touched.address_line1 && errors.address_line1 ? 'error' : ''}
                placeholder="Street address, P.O. Box"
                disabled={submitting}
              />
              {touched.address_line1 && errors.address_line1 && (
                <div className="error-message">{errors.address_line1}</div>
              )}
            </div>
            
            <div className="form-group">
              <label>Address Line 2</label>
              <input
                type="text"
                name="address_line2"
                value={formData.address_line2}
                onChange={handleChange}
                placeholder="Apartment, suite, unit"
                disabled={submitting}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={touched.city && errors.city ? 'error' : ''}
                  placeholder="e.g., Nairobi"
                  disabled={submitting}
                />
                {touched.city && errors.city && (
                  <div className="error-message">{errors.city}</div>
                )}
              </div>
              
              <div className="form-group">
                <label>State/Province</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g., Nairobi County"
                  disabled={submitting}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Postal Code</label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  placeholder="e.g., 00100"
                  disabled={submitting}
                />
              </div>
              
              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Country"
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">
              <i className="fas fa-ambulance"></i>
              Emergency Contact
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Contact Name</label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                  placeholder="Full name"
                  disabled={submitting}
                />
              </div>
              
              <div className="form-group">
                <label>Contact Phone</label>
                <input
                  type="tel"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                  placeholder="Phone number"
                  disabled={submitting}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Relationship</label>
              <input
                type="text"
                name="emergency_contact_relation"
                value={formData.emergency_contact_relation}
                onChange={handleChange}
                placeholder="e.g., Spouse, Parent"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">
              <i className="fas fa-notes-medical"></i>
              Medical Information
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Blood Type</label>
                <select
                  name="blood_type"
                  value={formData.blood_type}
                  onChange={handleChange}
                  disabled={submitting}
                >
                  {bloodTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Allergies</label>
                <input
                  type="text"
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  placeholder="e.g., Penicillin, Peanuts"
                  disabled={submitting}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Chronic Conditions</label>
              <input
                type="text"
                name="chronic_conditions"
                value={formData.chronic_conditions}
                onChange={handleChange}
                placeholder="e.g., Hypertension, Diabetes"
                disabled={submitting}
              />
            </div>
            
            <div className="form-group">
              <label>Current Medications</label>
              <input
                type="text"
                name="current_medications"
                value={formData.current_medications}
                onChange={handleChange}
                placeholder="List current medications"
                disabled={submitting}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Insurance Provider</label>
                <input
                  type="text"
                  name="insurance_provider"
                  value={formData.insurance_provider}
                  onChange={handleChange}
                  placeholder="e.g., NHIF, AAR"
                  disabled={submitting}
                />
              </div>
              
              <div className="form-group">
                <label>Insurance Number</label>
                <input
                  type="text"
                  name="insurance_number"
                  value={formData.insurance_number}
                  onChange={handleChange}
                  placeholder="Policy number"
                  disabled={submitting}
                />
              </div>
            </div>
            
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  disabled={submitting}
                />
                <i className="fas fa-check-circle" style={{ color: '#10b981' }}></i>
                Patient is Active
              </label>
            </div>
          </div>

          <div className="form-actions">
            <Link to={`/clinical/view-patient/${patientId}`} className="btn-outline">
              <i className="fas fa-times"></i>
              Cancel
            </Link>
            <button type="submit" className="btn-primary" disabled={submitting}>
              <i className="fas fa-save"></i>
              {submitting ? 'Updating...' : 'Update Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPatient;
