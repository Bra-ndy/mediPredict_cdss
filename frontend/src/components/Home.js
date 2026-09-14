import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();

  // Check if a user is logged in and redirect
  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);

        if (user.role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else if (user.role === 'clinician') {
          navigate('/clinical/dashboard', { replace: true });
        } else if (user.role === 'pending') {
          navigate('/pending-verification', { replace: true });
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, [navigate]);

  const features = [
    {
      icon: 'fa-brain',
      title: 'AI-Powered Analysis',
      description:
        'Advanced machine learning algorithms analyze multiple health parameters for accurate, evidence-based recommendations.'
    },
    {
      icon: 'fa-user-md',
      title: 'Built for Professionals',
      description:
        'Designed to support clinicians in making faster, safer, and more informed treatment decisions.'
    },
    {
      icon: 'fa-chart-line',
      title: 'Comprehensive Assessment',
      description:
        'Evaluate patients using vital signs, lab results, and clinical history in one unified platform.'
    }
  ];

  return (
    <div className="home">
      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">MediPredict CDSS</h1>
          <p className="hero-subtitle">
            Intelligent clinical decision support system that enhances patient care through AI-driven insights.
          </p>

          <div className="hero-actions">
            <Link to="/login" className="btn primary-btn">
              Get Started
            </Link>
            <Link to="/about" className="btn secondary-btn">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">Why Choose MediPredict?</h2>
          <p className="section-subtitle">
            Powerful tools designed to improve clinical accuracy and efficiency
          </p>

          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="icon-box">
                  <i className={`fas ${feature.icon}`}></i>
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-text">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-content">
          <h2>Start Improving Patient Outcomes Today</h2>
          <p>Join healthcare professionals using MediPredict for smarter decisions.</p>
          <Link to="/register" className="btn primary-btn">
            Create Account
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;