import React, { useState } from 'react';
import api from '../services/api';
import './Contact.css';

const Contact = () => {
  // State for form data
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    subject: '',
    message: ''
  });

  // State for form submission
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Quick contact items
  const quickItems = [
    {
      icon: 'fa-envelope',
      title: 'Email Us',
      value: 'support@medipredict.com'
    },
    {
      icon: 'fa-phone-alt',
      title: 'Call Us',
      value: '+254 796 375 403'
    },
    {
      icon: 'fa-map-marker-alt',
      title: 'Visit Us',
      value: 'Chuka, Tharaka Nithi'
    }
  ];

  // Subject options
  const subjectOptions = [
    { value: '', label: 'Select a subject' },
    { value: 'Technical Support', label: 'Technical Support' },
    { value: 'Clinical Question', label: 'Clinical Question' },
    { value: 'Feature Request', label: 'Feature Request' },
    { value: 'Billing Inquiry', label: 'Billing Inquiry' },
    { value: 'Partnership', label: 'Partnership' },
    { value: 'Other', label: 'Other' }
  ];

  // Hours of operation
  const hours = [
    { day: 'Monday - Friday', time: '8:00 AM - 5:00 PM' },
    { day: 'Saturday', time: '9:00 AM - 1:00 PM' },
    { day: 'Sunday', time: 'Closed' }
  ];

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.fullName || !formData.email || !formData.subject || !formData.message) {
      setSubmitError('Please fill in all fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setSubmitError('Please enter a valid email address');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      // Send email via backend API
      const response = await api.post('/contact/send', {
        name: formData.fullName,
        email: formData.email,
        subject: formData.subject,
        message: formData.message
      });

      if (response.data.success) {
        setSubmitSuccess(true);
        
        // Reset form
        setFormData({
          fullName: '',
          email: '',
          subject: '',
          message: ''
        });

        // Hide success message after 5 seconds
        setTimeout(() => {
          setSubmitSuccess(false);
        }, 5000);
      } else {
        setSubmitError(response.data.message || 'Failed to send message. Please try again.');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setSubmitError(err.response?.data?.message || 'Failed to send message. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      {/* Hero Section */}
      <div className="contact-hero">
        <div className="hero-icon">
          <i className="fas fa-headset"></i>
        </div>
        <h1>Get in Touch</h1>
        <p>We're here to help with any questions or support needs</p>
      </div>

      <div className="contact-wrapper">
        {/* Quick Contact Bar */}
        <div className="quick-bar">
          {quickItems.map((item, index) => (
            <div key={index} className="quick-item">
              <div className="quick-icon">
                <i className={`fas ${item.icon}`}></i>
              </div>
              <h3>{item.title}</h3>
              <p>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Success/Error Messages */}
        {submitSuccess && (
          <div className="alert alert-success">
            <i className="fas fa-check-circle"></i>
            Thank you for your message! We'll respond within 24 hours.
          </div>
        )}
        
        {submitError && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-circle"></i>
            {submitError}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="main-grid">
          {/* Contact Form */}
          <div className="form-card">
            <div className="card-header">
              <i className="fas fa-paper-plane"></i>
              <h2>Send a Message</h2>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <div className="input-wrapper">
                    <i className="fas fa-user"></i>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Your name"
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <div className="input-wrapper">
                    <i className="fas fa-envelope"></i>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="email@gmail.com"
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Subject</label>
                <div className="input-wrapper">
                  <i className="fas fa-tag"></i>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                  >
                    {subjectOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Message</label>
                <div className="input-wrapper">
                  <i className="fas fa-comment"></i>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="How can we help you?"
                    rows="4"
                    required
                    disabled={submitting}
                  ></textarea>
                </div>
              </div>

              <div className="form-footer">
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={submitting}
                >
                  <i className="fas fa-paper-plane"></i>
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>

          {/* Contact Information */}
          <div className="info-card">
            <div className="card-header">
              <i className="fas fa-address-card"></i>
              <h2>Contact Info</h2>
            </div>

            <div className="info-grid">
              {/* Email Block */}
              <div className="info-block">
                <div className="info-icon">
                  <i className="fas fa-envelope"></i>
                </div>
                <div className="info-content">
                  <h3>Email</h3>
                  <a href="mailto:support@medipredict.com" className="email-link">
                    support@medipredict.com
                  </a>
                  <a href="mailto:info@medipredict.com" className="email-link">
                    info@medipredict.com
                  </a>
                  <div className="sub-detail">Response within 24h</div>
                </div>
              </div>

              {/* Phone Block */}
              <div className="info-block">
                <div className="info-icon">
                  <i className="fas fa-phone-alt"></i>
                </div>
                <div className="info-content">
                  <h3>Phone</h3>
                  <div className="detail">+254 796 375 403</div>
                  <div className="sub-detail">Mon-Fri, 8:00 - 17:00 EAT</div>
                </div>
              </div>

              {/* Address Block */}
              <div className="info-block">
                <div className="info-icon">
                  <i className="fas fa-map-marker-alt"></i>
                </div>
                <div className="info-content">
                  <h3>Address</h3>
                  <div className="detail">109 Chuka</div>
                  <div className="detail">Tharaka Nithi, Kenya</div>
                  <div className="sub-detail">East Africa</div>
                </div>
              </div>
            </div>

            {/* Hours Section */}
            <div className="hours-section">
              <div className="hours-header">
                <i className="fas fa-clock"></i>
                <h3>Support Hours</h3>
              </div>

              <div className="hours-table">
                {hours.map((hour, index) => (
                  <div key={index} className="hours-row">
                    <span className="day">{hour.day}</span>
                    <span className="time">{hour.time}</span>
                  </div>
                ))}
              </div>

              <div className="emergency-badge">
                <i className="fas fa-exclamation-triangle"></i>
                <span>For urgent clinical matters, call our emergency line</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="map-section">
          <div className="map-placeholder">
            <i className="fas fa-map-marked-alt"></i>
            <p>109 Chuka, Tharaka Nithi, Kenya</p>
            <small>Visit our headquarters in Tharaka Nithi</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;