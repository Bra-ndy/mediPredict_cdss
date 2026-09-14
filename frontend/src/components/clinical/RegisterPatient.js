import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import './RegisterPatient.css';

const RegisterPatient = () => {
  const navigate = useNavigate();
  
  // State for form data
  const [formData, setFormData] = useState({
    // Personal Information
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    marital_status: '',
    occupation: '',
    
    // Contact Information
    phone_number: '',
    alternate_phone: '',
    email: '',
    national_id: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Kenya',
    
    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    
    // Medical Information
    blood_type: '',
    allergies: '',
    chronic_conditions: '',
    current_medications: '',
    insurance_provider: '',
    insurance_number: ''
  });
  
  // State for form validation errors
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  // State for loading and submission
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle field blur for validation
  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Validate field
    validateField(name, formData[name]);
  };

  // Validate individual field
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
    
    return error;
  };

  // Calculate age from date of birth
  const calculateAge = (dob) => {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  // Get max date for DOB (today)
  const getMaxDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Validate entire form before submission
  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      'first_name', 'last_name', 'date_of_birth', 'gender',
      'phone_number', 'address_line1', 'city'
    ];
    
    requiredFields.forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });
    
    // Validate email if provided
    if (formData.email) {
      const emailError = validateField('email', formData.email);
      if (emailError) newErrors.email = emailError;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched = {};
    Object.keys(formData).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);
    
    // Validate form
    if (!validateForm()) {
      // Scroll to first error
      const firstError = document.querySelector('.error-message');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setLoading(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const response = await api.post('/clinical/patients', formData);
      
      setSubmitSuccess(`Patient ${formData.first_name} ${formData.last_name} registered successfully!`);
      
      // Redirect to patient view after 2 seconds
      setTimeout(() => {
        navigate(`/clinical/view-patient/${response.data.patient_id}`);
      }, 2000);
      
    } catch (err) {
      setSubmitError(
        err.response?.data?.message || 
        'Failed to register patient. Please check all fields and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Gender options
  const genderOptions = [
    { value: '', label: 'Select Gender' },
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' }
  ];

  // Marital status options
  const maritalOptions = [
    { value: '', label: 'Select Status' },
    { value: 'Single', label: 'Single' },
    { value: 'Married', label: 'Married' },
    { value: 'Divorced', label: 'Divorced' },
    { value: 'Widowed', label: 'Widowed' }
  ];

  // Blood type options
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

  return (
    <div className="register-patient">
      <div className="page-header">
        <h1>
          <i className="fas fa-user-plus"></i>
          Register New Patient
        </h1>
        <p>Enter patient information to create a new medical record</p>
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
          {/* Personal Information */}
          <div className="form-section">
            <h3 className="section-title">
              <i className="fas fa-user"></i>
              Personal Information
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>
                  <i className="fas fa-id-card"></i>
                  First Name *
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={touched.first_name && errors.first_name ? 'error' : ''}
                  placeholder="Enter first name"
                  disabled={loading}
                />
                {touched.first_name && errors.first_name && (
                  <div className="error-message">{errors.first_name}</div>
                )}
              </div>
              
              <div className="form-group">
                <label>
                  <i className="fas fa-id-card"></i>
                  Last Name *
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={touched.last_name && errors.last_name ? 'error' : ''}
                  placeholder="Enter last name"
                  disabled={loading}
                />
                {touched.last_name && errors.last_name && (
                  <div className="error-message">{errors.last_name}</div>
                )}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>
                  <i className="fas fa-calendar"></i>
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  max={getMaxDate()}
                  className={touched.date_of_birth && errors.date_of_birth ? 'error' : ''}
                  disabled={loading}
                />
                {touched.date_of_birth && errors.date_of_birth && (
                  <div className="error-message">{errors.date_of_birth}</div>
                )}
              </div>
              
              <div className="form-group">
                <label>
                  <i className="fas fa-venus-mars"></i>
                  Gender *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={touched.gender && errors.gender ? 'error' : ''}
                  disabled={loading}
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
                <label>
                  <i className="fas fa-ring"></i>
                  Marital Status
                </label>
                <select
                  name="marital_status"
                  value={formData.marital_status}
                  onChange={handleChange}
                  disabled={loading}
                >
                  {maritalOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>
                  <i className="fas fa-briefcase"></i>
                  Occupation
                </label>
                <input
                  type="text"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleChange}
                  placeholder="e.g., Teacher, Engineer"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="form-section">
            <h3 className="section-title">
              <i className="fas fa-address-book"></i>
              Contact Information
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>
                  <i className="fas fa-phone"></i>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={touched.phone_number && errors.phone_number ? 'error' : ''}
                  placeholder="e.g., 0712345678"
                  disabled={loading}
                />
                {touched.phone_number && errors.phone_number && (
                  <div className="error-message">{errors.phone_number}</div>
                )}
              </div>
              
              <div className="form-group">
                <label>
                  <i className="fas fa-phone-alt"></i>
                  Alternate Phone
                </label>
                <input
                  type="tel"
                  name="alternate_phone"
                  value={formData.alternate_phone}
                  onChange={handleChange}
                  placeholder="e.g., 0723456789"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>
                  <i className="fas fa-envelope"></i>
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={touched.email && errors.email ? 'error' : ''}
                  placeholder="patient@example.com"
                  disabled={loading}
                />
                {touched.email && errors.email && (
                  <div className="error-message">{errors.email}</div>
                )}
              </div>
              
              <div className="form-group">
                <label>
                  <i className="fas fa-id-card"></i>
                  National ID
                </label>
                <input
                  type="text"
                  name="national_id"
                  value={formData.national_id}
                  onChange={handleChange}
                  placeholder="ID Card Number"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>
                <i className="fas fa-map-marker-alt"></i>
                Address Line 1 *
              </label>
              <input
                type="text"
                name="address_line1"
                value={formData.address_line1}
                onChange={handleChange}
                onBlur={handleBlur}
                className={touched.address_line1 && errors.address_line1 ? 'error' : ''}
                placeholder="Street address, P.O. Box"
                disabled={loading}
              />
              {touched.address_line1 && errors.address_line1 && (
                <div className="error-message">{errors.address_line1}</div>
              )}
            </div>
            
            <div className="form-group">
              <label>
                <i className="fas fa-map-marker-alt"></i>
                Address Line 2
              </label>
              <input
                type="text"
                name="address_line2"
                value={formData.address_line2}
                onChange={handleChange}
                placeholder="Apartment, suite, unit"
                disabled={loading}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>
                  <i className="fas fa-city"></i>
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={touched.city && errors.city ? 'error' : ''}
                  placeholder="e.g., Nairobi"
                  disabled={loading}
                />
                {touched.city && errors.city && (
                  <div className="error-message">{errors.city}</div>
                )}
              </div>
              
              <div className="form-group">
                <label>
                  <i className="fas fa-map-pin"></i>
                  State/Province
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g., Nairobi County"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>
                  <i className="fas fa-mail-bulk"></i>
                  Postal Code
                </label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  placeholder="e.g., 00100"
                  disabled={loading}
                />
              </div>
              
              <div className="form-group">
                <label>
                  <i className="fas fa-globe"></i>
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Country"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="form-section">
            <h3 className="section-title">
              <i className="fas fa-ambulance"></i>
              Emergency Contact
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>
                  <i className="fas fa-user"></i>
                  Contact Name
                </label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                  placeholder="Full name"
                  disabled={loading}
                />
              </div>
              
              <div className="form-group">
                <label>
                  <i className="fas fa-phone"></i>
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                  placeholder="Phone number"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>
                <i className="fas fa-users"></i>
                Relationship
              </label>
              <input
                type="text"
                name="emergency_contact_relation"
                value={formData.emergency_contact_relation}
                onChange={handleChange}
                placeholder="e.g., Spouse, Parent"
                disabled={loading}
              />
            </div>
          </div>

          {/* Medical Information */}
          <div className="form-section">
            <h3 className="section-title">
              <i className="fas fa-notes-medical"></i>
              Medical Information
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>
                  <i className="fas fa-tint"></i>
                  Blood Type
                </label>
                <select
                  name="blood_type"
                  value={formData.blood_type}
                  onChange={handleChange}
                  disabled={loading}
                >
                  {bloodTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>
                  <i className="fas fa-allergies"></i>
                  Allergies
                </label>
                <input
                  type="text"
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  placeholder="e.g., Penicillin, Peanuts"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>
                <i className="fas fa-heartbeat"></i>
                Chronic Conditions
              </label>
              <input
                type="text"
                name="chronic_conditions"
                value={formData.chronic_conditions}
                onChange={handleChange}
                placeholder="e.g., Hypertension, Diabetes"
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label>
                <i className="fas fa-prescription-bottle"></i>
                Current Medications
              </label>
              <input
                type="text"
                name="current_medications"
                value={formData.current_medications}
                onChange={handleChange}
                placeholder="List current medications"
                disabled={loading}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>
                  <i className="fas fa-file-invoice"></i>
                  Insurance Provider
                </label>
                <input
                  type="text"
                  name="insurance_provider"
                  value={formData.insurance_provider}
                  onChange={handleChange}
                  placeholder="e.g., NHIF, AAR"
                  disabled={loading}
                />
              </div>
              
              <div className="form-group">
                <label>
                  <i className="fas fa-id-card"></i>
                  Insurance Number
                </label>
                <input
                  type="text"
                  name="insurance_number"
                  value={formData.insurance_number}
                  onChange={handleChange}
                  placeholder="Policy number"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <Link to="/clinical/patient-search" className="btn btn-outline">
              <i className="fas fa-times"></i>
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <i className="fas fa-save"></i>
              {loading ? 'Registering...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPatient;
