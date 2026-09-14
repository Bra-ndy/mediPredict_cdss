import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import './ResetPassword.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  
  const [formData, setFormData] = useState({
    password: '',
    confirm_password: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [tokenValid, setTokenValid] = useState(true);
  const [tokenChecked, setTokenChecked] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenValid(false);
        setTokenChecked(true);
        setError('Invalid or missing reset token');
        return;
      }

      try {
        await api.get(`/auth/validate-reset-token/${token}`);
        setTokenValid(true);
        setTokenChecked(true);
      } catch (err) {
        setTokenValid(false);
        setTokenChecked(true);
        setError(
          err.response?.data?.message || 
          'Invalid or expired reset token. Please request a new password reset link.'
        );
      }
    };

    validateToken();
  }, [token]);

  const validatePassword = (password) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear field errors
    if (fieldErrors[name]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: ''
      });
    }

    // Validate password
    if (name === 'password') {
      const error = validatePassword(value);
      if (error) {
        setFieldErrors(prev => ({ ...prev, password: error }));
      } else {
        setFieldErrors(prev => ({ ...prev, password: '' }));
      }
    }

    // Validate confirm password
    if (name === 'confirm_password' || (name === 'password' && formData.confirm_password)) {
      if (name === 'confirm_password' && value !== formData.password) {
        setFieldErrors(prev => ({ ...prev, confirm_password: 'Passwords do not match' }));
      } else if (name === 'password' && formData.confirm_password && value !== formData.confirm_password) {
        setFieldErrors(prev => ({ ...prev, confirm_password: 'Passwords do not match' }));
      } else {
        setFieldErrors(prev => ({ ...prev, confirm_password: '' }));
      }
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.confirm_password) {
      errors.confirm_password = 'Please confirm your password';
    } else if (formData.password !== formData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Please fix the errors in the form');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(`/auth/reset-password/${token}`, {
        password: formData.password
      });
      
      setSuccess(response.data.message || 'Password reset successful! Redirecting to login...');
      
      setFormData({
        password: '',
        confirm_password: ''
      });
      
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Password reset successful! Please login with your new password.' 
          }
        });
      }, 3000);
      
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Failed to reset password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const pass = formData.password;
    if (!pass) return 0;
    
    let strength = 0;
    if (pass.length >= 6) strength += 25;
    if (pass.length >= 8) strength += 25;
    if (/[A-Z]/.test(pass)) strength += 25;
    if (/[0-9]/.test(pass)) strength += 25;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 25;
    
    return Math.min(100, strength);
  };

  const getStrengthColor = () => {
    const strength = getPasswordStrength();
    if (strength >= 75) return '#10b981';
    if (strength >= 50) return '#f59e0b';
    if (strength >= 25) return '#e67e22';
    return '#ef4444';
  };

  const getStrengthText = () => {
    const strength = getPasswordStrength();
    if (strength >= 75) return 'Strong';
    if (strength >= 50) return 'Medium';
    if (strength >= 25) return 'Weak';
    return 'Very Weak';
  };

  if (!tokenChecked) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="loading-spinner"></div>
          <p>Validating reset link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="expired-message">
            <i className="fas fa-exclamation-triangle"></i>
            <h2>Invalid or Expired Link</h2>
            <p>The password reset link is invalid or has expired.</p>
            <Link to="/forgot-password" className="btn-link">
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <div className="card-header">
          <i className="fas fa-lock"></i>
          <h2>Set New Password</h2>
        </div>
        <p className="card-subtitle">Enter your new password below</p>
        
        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-circle"></i>
            <div className="alert-content">{error}</div>
          </div>
        )}
        
        {success && (
          <div className="alert alert-success">
            <i className="fas fa-check-circle"></i>
            <div className="alert-content">{success}</div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">
              <i className="fas fa-lock"></i>
              New Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Min. 6 characters"
              className={fieldErrors.password ? 'error' : ''}
              disabled={loading || success}
            />
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className="strength-fill" 
                    style={{ 
                      width: `${getPasswordStrength()}%`,
                      backgroundColor: getStrengthColor()
                    }}
                  ></div>
                </div>
                <span className="strength-text" style={{ color: getStrengthColor() }}>
                  {getStrengthText()}
                </span>
              </div>
            )}
            {fieldErrors.password && (
              <small className="error-text">{fieldErrors.password}</small>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirm_password">
              <i className="fas fa-lock"></i>
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirm_password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              required
              placeholder="Re-enter new password"
              className={fieldErrors.confirm_password ? 'error' : ''}
              disabled={loading || success}
            />
            {fieldErrors.confirm_password && (
              <small className="error-text">{fieldErrors.confirm_password}</small>
            )}
          </div>
          
          <button 
            type="submit" 
            className="btn-submit"
            disabled={loading || success}
          >
            <i className="fas fa-save"></i>
            {loading ? 'Resetting...' : success ? 'Password Reset!' : 'Reset Password'}
          </button>
        </form>
        
        <div className="back-link">
          <Link to="/login">
            <i className="fas fa-arrow-left"></i> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;