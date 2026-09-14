// components/PendingVerification.js
import React from 'react';
import { Link } from 'react-router-dom';
import './PendingVerification.css';

const PendingVerification = () => {
  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="pending-container">
      <div className="pending-card">
        <div className="pending-icon">
          <i className="fas fa-clock"></i>
        </div>
        <h1>Account Pending Verification</h1>
        <p>Your account is currently pending approval from an administrator.</p>
        <p>You'll receive access to the system once your account is verified.</p>
        
        <div className="pending-info">
          <div className="info-item">
            <i className="fas fa-user-clock"></i>
            <span>Status: <strong>Pending Review</strong></span>
          </div>
          <div className="info-item">
            <i className="fas fa-envelope"></i>
            <span>Check your email for updates</span>
          </div>
          <div className="info-item">
            <i className="fas fa-headset"></i>
            <span>Contact support if you have questions</span>
          </div>
        </div>

        <div className="pending-actions">
          <button onClick={handleLogout} className="btn btn-outline">
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
          <Link to="/contact" className="btn btn-primary">
            <i className="fas fa-headset"></i>
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PendingVerification;