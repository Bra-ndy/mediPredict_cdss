import React from 'react';
import './About.css';

const About = () => {
  const steps = [
    {
      number: 1,
      title: 'Patient Registration',
      description: 'Register patient with demographic and medical information'
    },
    {
      number: 2,
      title: 'Clinical Assessment',
      description: 'Enter vital signs, lab results, and clinical findings'
    },
    {
      number: 3,
      title: 'AI Analysis',
      description: 'Machine learning model analyzes patient data'
    },
    {
      number: 4,
      title: 'Recommendation & Report',
      description: 'Receive drug recommendations and generate clinical reports'
    }
  ];

  const features = [
    {
      icon: 'fa-brain',
      title: 'AI-Powered',
      description: 'Advanced ML algorithms'
    },
    {
      icon: 'fa-user-md',
      title: 'For Clinicians',
      description: 'Decision support tool'
    },
    {
      icon: 'fa-shield-alt',
      title: 'Evidence-Based',
      description: 'Clinical guidelines'
    }
  ];

  const badges = [
    {
      icon: 'fa-check-circle',
      text: 'HIPAA Compliant'
    },
    {
      icon: 'fa-check-circle',
      text: 'Evidence-Based'
    },
    {
      icon: 'fa-check-circle',
      text: 'Secure & Private'
    }
  ];

  return (
    <div className="about-page">
      <div className="hero-section">
        <h1 className="hero-title">About MediPredict CDSS</h1>
        <p className="hero-subtitle">
          Clinical Decision Support System powered by advanced machine learning for healthcare professionals
        </p>
      </div>

      <div className="content-grid">
        <div className="card mission-card">
          <h3 className="section-title">
            <i className="fas fa-info-circle"></i>
            Our Mission
          </h3>
          <p className="mission-text">
            MediPredict CDSS is designed to assist healthcare professionals in making evidence-based 
            medication decisions through advanced machine learning algorithms. Our system analyzes 
            patient health parameters to provide personalized drug recommendations, helping clinicians 
            deliver better patient care.
          </p>
          
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-item">
                <i className={`fas ${feature.icon} feature-icon`}></i>
                <h4 className="feature-title">{feature.title}</h4>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card how-it-works-card">
          <h3 className="section-title">
            <i className="fas fa-cogs"></i>
            How It Works
          </h3>
          
          <div className="steps-container">
            {steps.map((step) => (
              <div key={step.number} className="step-item">
                <div className="step-number">{step.number}</div>
                <div className="step-content">
                  <h4 className="step-title">{step.title}</h4>
                  <p className="step-description">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card professionals-card">
        <h3 className="section-title centered">
          <i className="fas fa-stethoscope"></i>
          For Healthcare Professionals
        </h3>
        <p className="professionals-text">
          MediPredict CDSS is designed exclusively for licensed healthcare practitioners. 
          The system serves as a decision support tool and does not replace clinical judgment.
        </p>
        
        <div className="badges-container">
          {badges.map((badge, index) => (
            <span key={index} className="badge">
              <i className={`fas ${badge.icon}`}></i> {badge.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default About;