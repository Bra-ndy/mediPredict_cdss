import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

const Signup = () => {
  const navigate = useNavigate();
  
  // State for form data
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    license_number: '',
    institution: '',
    specialization: '',
    professional_id: ''
  });
  
  // State for loading, errors, and validation
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Password validation function
  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    return '';
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: ''
      });
    }

    // Validate password on change
    if (name === 'password') {
      const error = validatePassword(value);
      setPasswordError(error);
    }

    // Check password match when confirm_password changes
    if (name === 'confirm_password' || (name === 'password' && formData.confirm_password)) {
      if (name === 'confirm_password' && value !== formData.password) {
        setFieldErrors({
          ...fieldErrors,
          confirm_password: 'Passwords do not match'
        });
      } else if (name === 'password' && formData.confirm_password && value !== formData.confirm_password) {
        setFieldErrors({
          ...fieldErrors,
          confirm_password: 'Passwords do not match'
        });
      } else {
        setFieldErrors({
          ...fieldErrors,
          confirm_password: ''
        });
      }
    }
  };

  // Validate all fields before submission
  const validateForm = () => {
    const errors = {};
    
    if (!formData.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.confirm_password) {
      errors.confirm_password = 'Please confirm your password';
    } else if (formData.password !== formData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    
    if (!formData.license_number.trim()) {
      errors.license_number = 'Medical license number is required';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      setError('Please fix the errors in the form');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Remove confirm_password before sending to backend
      const { confirm_password, ...signupData } = formData;
      
      // Call signup API
      const response = await api.post('/auth/signup', signupData);
      
      setSuccess('Account created successfully! Redirecting to login...');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Account created successfully! Please wait for admin approval before logging in.' 
          }
        });
      }, 2000);
      
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Specialization options
  const specializations = [
    { value: '', label: 'Select Specialization' },
    { value: 'General Practice', label: 'General Practice' },
    { value: 'Internal Medicine', label: 'Internal Medicine' },
    { value: 'Cardiology', label: 'Cardiology' },
    { value: 'Endocrinology', label: 'Endocrinology' },
    { value: 'Family Medicine', label: 'Family Medicine' },
    { value: 'Pediatrics', label: 'Pediatrics' },
    { value: 'Obstetrics & Gynecology', label: 'Obstetrics & Gynecology' },
    { value: 'Psychiatry', label: 'Psychiatry' },
    { value: 'Emergency Medicine', label: 'Emergency Medicine' },
    { value: 'Surgery', label: 'Surgery' },
    { value: 'Other', label: 'Other' }
  ];

  // Styles
  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '70vh',
      padding: '1rem'
    },
    card: {
      maxWidth: '650px',
      width: '100%',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      padding: '2rem'
    },
    title: {
      color: '#2c3e50',
      fontSize: '1.8rem',
      marginBottom: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    subtitle: {
      color: '#7f8c8d',
      marginBottom: '2rem'
    },
    formGroup: {
      marginBottom: '1.5rem'
    },
    formRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '1rem',
      marginBottom: '1rem'
    },
    label: {
      display: 'block',
      marginBottom: '0.5rem',
      color: '#34495e',
      fontWeight: '500'
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #bdc3c7',
      borderRadius: '4px',
      fontSize: '1rem'
    },
    inputError: {
      border: '1px solid #e74c3c'
    },
    select: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #bdc3c7',
      borderRadius: '4px',
      fontSize: '1rem',
      backgroundColor: 'white'
    },
    textMuted: {
      fontSize: '0.85rem',
      color: '#7f8c8d',
      marginTop: '0.25rem',
      display: 'block'
    },
    errorText: {
      color: '#e74c3c',
      fontSize: '0.85rem',
      marginTop: '0.25rem',
      display: 'block'
    },
    verificationSection: {
      background: 'rgba(37, 99, 235, 0.03)',
      padding: '1.5rem',
      borderRadius: '10px',
      margin: '1.5rem 0'
    },
    verificationTitle: {
      fontSize: '1.1rem',
      marginBottom: '1rem',
      color: '#2c3e50',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    noteBox: {
      background: 'rgba(245, 158, 11, 0.05)',
      padding: '1rem',
      borderRadius: '10px',
      borderLeft: '4px solid #f59e0b'
    },
    infoBox: {
      background: 'rgba(37, 99, 235, 0.05)',
      padding: '1rem',
      borderRadius: '10px',
      borderLeft: '4px solid #3498db'
    },
    ul: {
      marginTop: '0.5rem',
      marginBottom: 0,
      paddingLeft: '1.5rem',
      color: '#7f8c8d',
      fontSize: '0.9rem'
    },
    button: {
      width: '100%',
      padding: '0.75rem',
      backgroundColor: '#3498db',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '1rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem'
    },
    buttonDisabled: {
      backgroundColor: '#95a5a6',
      cursor: 'not-allowed'
    },
    footer: {
      textAlign: 'center',
      marginTop: '2rem',
      color: '#7f8c8d'
    },
    link: {
      color: '#3498db',
      textDecoration: 'none',
      fontWeight: '600'
    },
    errorAlert: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
      padding: '1rem',
      borderRadius: '4px',
      marginBottom: '1rem',
      border: '1px solid #f5c6cb'
    },
    successAlert: {
      backgroundColor: '#d4edda',
      color: '#155724',
      padding: '1rem',
      borderRadius: '4px',
      marginBottom: '1rem',
      border: '1px solid #c3e6cb'
    },
    icon: {
      marginRight: '0.5rem',
      color: '#3498db'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>
          <i className="fas fa-user-plus" style={styles.icon}></i>
          Create Account
        </h2>
        <p style={styles.subtitle}>Register as a healthcare professional</p>
        
        {error && (
          <div style={styles.errorAlert}>
            <i className="fas fa-exclamation-circle" style={{marginRight: '0.5rem'}}></i>
            {error}
          </div>
        )}
        
        {success && (
          <div style={styles.successAlert}>
            <i className="fas fa-check-circle" style={{marginRight: '0.5rem'}}></i>
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label htmlFor="full_name" style={styles.label}>
              <i className="fas fa-user" style={styles.icon}></i>
              Full Name
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
              style={{
                ...styles.input,
                ...(fieldErrors.full_name ? styles.inputError : {})
              }}
              disabled={loading}
            />
            {fieldErrors.full_name && (
              <small style={styles.errorText}>{fieldErrors.full_name}</small>
            )}
          </div>
          
          <div style={styles.formGroup}>
            <label htmlFor="email" style={styles.label}>
              <i className="fas fa-envelope" style={styles.icon}></i>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              style={{
                ...styles.input,
                ...(fieldErrors.email ? styles.inputError : {})
              }}
              disabled={loading}
            />
            {fieldErrors.email && (
              <small style={styles.errorText}>{fieldErrors.email}</small>
            )}
          </div>
          
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label htmlFor="password" style={styles.label}>
                <i className="fas fa-lock" style={styles.icon}></i>
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Min. 8 characters"
                style={{
                  ...styles.input,
                  ...(fieldErrors.password || passwordError ? styles.inputError : {})
                }}
                disabled={loading}
              />
              <small style={styles.textMuted}>Must be at least 8 characters long</small>
              {passwordError && (
                <small style={styles.errorText}>{passwordError}</small>
              )}
              {fieldErrors.password && (
                <small style={styles.errorText}>{fieldErrors.password}</small>
              )}
            </div>
            
            <div style={styles.formGroup}>
              <label htmlFor="confirm_password" style={styles.label}>
                <i className="fas fa-lock" style={styles.icon}></i>
                Confirm Password
              </label>
              <input
                type="password"
                id="confirm_password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                required
                placeholder="Re-enter password"
                style={{
                  ...styles.input,
                  ...(fieldErrors.confirm_password ? styles.inputError : {})
                }}
                disabled={loading}
              />
              {fieldErrors.confirm_password && (
                <small style={styles.errorText}>{fieldErrors.confirm_password}</small>
              )}
            </div>
          </div>
          
          {/* Professional Verification Fields */}
          <div style={styles.verificationSection}>
            <h3 style={styles.verificationTitle}>
              <i className="fas fa-id-card" style={{color: '#3498db'}}></i>
              Professional Verification
            </h3>
            
            <div style={styles.formGroup}>
              <label htmlFor="license_number" style={styles.label}>
                <i className="fas fa-stethoscope" style={styles.icon}></i>
                Medical License Number *
              </label>
              <input
                type="text"
                id="license_number"
                name="license_number"
                value={formData.license_number}
                onChange={handleChange}
                required
                placeholder="e.g., KMPDC 12345"
                style={{
                  ...styles.input,
                  ...(fieldErrors.license_number ? styles.inputError : {})
                }}
                disabled={loading}
              />
              <small style={styles.textMuted}>Your professional license/registration number</small>
              {fieldErrors.license_number && (
                <small style={styles.errorText}>{fieldErrors.license_number}</small>
              )}
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="institution" style={styles.label}>
                <i className="fas fa-hospital" style={styles.icon}></i>
                Institution/Hospital
              </label>
              <input
                type="text"
                id="institution"
                name="institution"
                value={formData.institution}
                onChange={handleChange}
                placeholder="e.g., Kenyatta National Hospital"
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="specialization" style={styles.label}>
                <i className="fas fa-user-md" style={styles.icon}></i>
                Specialization
              </label>
              <select
                id="specialization"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                style={styles.select}
                disabled={loading}
              >
                {specializations.map(spec => (
                  <option key={spec.value} value={spec.value}>
                    {spec.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="professional_id" style={styles.label}>
                <i className="fas fa-passport" style={styles.icon}></i>
                National ID/Provider Number
              </label>
              <input
                type="text"
                id="professional_id"
                name="professional_id"
                value={formData.professional_id}
                onChange={handleChange}
                placeholder="National ID or provider number"
                style={styles.input}
                disabled={loading}
              />
              <small style={styles.textMuted}>Optional but recommended for verification</small>
            </div>
          </div>
          
          <div style={styles.formGroup}>
            <div style={styles.noteBox}>
              <p style={{margin: 0, fontSize: '0.9rem', color: '#7f8c8d'}}>
                <i className="fas fa-info-circle" style={{color: '#f59e0b'}}></i>
                <strong> Note:</strong> Your account will require administrator verification before you can access the system. 
                You will receive an email notification once your account is approved.
              </p>
            </div>
          </div>
          
          <div style={styles.formGroup}>
            <div style={styles.infoBox}>
              <p style={{margin: 0, fontSize: '0.9rem', color: '#7f8c8d'}}>
                <i className="fas fa-check-circle" style={{color: '#3498db'}}></i>
                By creating an account, you confirm that:
              </p>
              <ul style={styles.ul}>
                <li>You are a licensed healthcare professional</li>
                <li>The information provided is accurate and truthful</li>
                <li>You will use this system for clinical decision support only</li>
                <li>You understand that AI recommendations are for reference only and do not replace clinical judgment</li>
              </ul>
            </div>
          </div>
          
          <button 
            type="submit" 
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {})
            }}
            disabled={loading}
          >
            <i className="fas fa-user-plus"></i>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div style={styles.footer}>
          <p>
            Already have an account?{' '}
            <Link to="/login" style={styles.link}>
              Login here
            </Link>
          </p>
        </div>
        
        <div style={{textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: '#7f8c8d'}}>
          <p>
            Having trouble?{' '}
            <Link to="/contact" style={styles.link}>
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
