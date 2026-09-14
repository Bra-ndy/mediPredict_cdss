import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './ForgotPassword.css';

const ForgotPassword = () => {
  // State for form data
  const [email, setEmail] = useState('');
  
  // State for loading, errors, and success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [emailError, setEmailError] = useState('');

  // Validate email format
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      return 'Email is required';
    }
    if (!re.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  // Handle email change
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear email error as user types
    if (emailError) {
      const errorMsg = validateEmail(value);
      setEmailError(errorMsg);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate email
    const validationError = validateEmail(email);
    if (validationError) {
      setEmailError(validationError);
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    setResetLink('');

    try {
      // Call forgot password API
      const response = await api.post('/auth/forgot-password', { email });
      
      // Show success message
      setSuccess(
        response.data.message || 
        'Password reset link has been sent to your email. Please check your inbox.'
      );
      
      // Check if backend returned a reset link
      if (response.data.reset_link) {
        setResetLink(response.data.reset_link);
      }
      
      // Clear the form
      setEmail('');
      
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Failed to send reset link. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <div className="card-header">
          <i className="fas fa-key"></i>
          <h2>Reset Password</h2>
        </div>
        <p className="card-subtitle">Enter your email to receive a password reset link</p>
        
        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-circle"></i>
            <div className="alert-content">{error}</div>
          </div>
        )}
        
        {success && (
          <div className="alert alert-success">
            <i className="fas fa-check-circle"></i>
            <div className="alert-content">
              {success}
              {resetLink && (
                <div className="reset-link-section">
                  <div className="reset-link-label">Click to reset password:</div>
                  <div className="reset-link-value">
                    <a href={resetLink} style={{ color: '#166534', textDecoration: 'underline' }}>
                      Reset your password
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">
              <i className="fas fa-envelope"></i>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleEmailChange}
              required
              placeholder="Enter your registered email"
              className={emailError ? 'error' : ''}
              disabled={loading || success}
            />
            {emailError && (
              <small className="error-text">{emailError}</small>
            )}
          </div>
          
          <button 
            type="submit" 
            className="btn-submit"
            disabled={loading || success}
          >
            <i className="fas fa-paper-plane"></i>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        
        {/* Info box */}
        {!success && (
          <div className="info-box">
            <i className="fas fa-info-circle"></i>
            <span>
              We'll send a password reset link to your email if it exists in our system.
              Please check your spam folder if you don't see it in your inbox.
            </span>
          </div>
        )}
        
        <div className="back-link">
          <Link to="/login">
            <i className="fas fa-arrow-left"></i> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;